import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AssignmentTeam as PrismaAssignmentTeam,
  AttachmentScanStatus,
  ComplaintCategory as PrismaComplaintCategory,
  ComplaintSeverity as PrismaComplaintSeverity,
  ComplaintStatus as PrismaComplaintStatus,
  MessageSenderType,
  StaffRole as PrismaStaffRole,
  type AuditLog,
  type Case,
  type IdentityDisclosure,
  type InternalNote,
  type Message,
  type Prisma,
  type StaffUser,
} from '@prisma/client';
import { Subject, type Observable } from 'rxjs';

import { PrismaService } from '../prisma.service';
import { AttachmentService } from './attachment.service';
import {
  type AdminCaseDetail,
  type AdminCaseFilters,
  type AssignmentRecord,
  type AssignmentTeam,
  type AttachmentDownload,
  type AttachmentInput,
  type AttachmentRecord,
  type AuditAction,
  type AuditFilters,
  type AuditLogRecord,
  type CaseRecord,
  type ComplaintCategory,
  type ComplaintSeverity,
  type ComplaintStatus,
  type CreateComplaintInput,
  type IdentityDisclosureInput,
  type IdentityDisclosureRecord,
  type InternalNoteRecord,
  type MessageRecord,
  type PublicMessageInput,
  type RealtimeEvent,
  type ReconnectInput,
  type StaffLoginInput,
  type StaffRole,
  type StaffUserRecord,
  type TimelineItem,
} from './complaints.types';
import {
  EMERGENCY_RESOURCES,
  classifySeverity,
  generateAnonId,
  generateSecret,
  makeId,
} from './complaints.util';
import { RateLimitService } from './rate-limit.service';
import { SecretHashService } from './secret-hash.service';
import { TokenService } from './token.service';

type AdminIdentity = {
  id: string;
  role: StaffRole;
};

type CaseSession = {
  caseId: string;
  anonId: string;
};

type CreateStaffUserInput = {
  email: string;
  password: string;
  role: StaffRole;
  isActive?: boolean;
};

type UpdateStaffUserInput = Partial<CreateStaffUserInput>;

type CaseBundle = Prisma.CaseGetPayload<{
  include: {
    messages: { include: { attachments: true }; orderBy: { createdAt: 'asc' } };
    attachments: { orderBy: { createdAt: 'desc' } };
    assignments: { orderBy: { createdAt: 'desc' } };
    disclosures: { orderBy: { createdAt: 'desc' } };
    internalNotes: { orderBy: { createdAt: 'desc' } };
    auditLogs: { orderBy: { createdAt: 'desc' } };
  };
}>;

const CATEGORY_TO_PRISMA: Record<ComplaintCategory, PrismaComplaintCategory> = {
  ragging: PrismaComplaintCategory.RAGGING,
  harassment: PrismaComplaintCategory.HARASSMENT,
  mental_health: PrismaComplaintCategory.MENTAL_HEALTH,
  discrimination: PrismaComplaintCategory.DISCRIMINATION,
  lecturer_behavior: PrismaComplaintCategory.LECTURER_BEHAVIOR,
  other: PrismaComplaintCategory.OTHER,
};

const CATEGORY_FROM_PRISMA: Record<PrismaComplaintCategory, ComplaintCategory> = {
  RAGGING: 'ragging',
  HARASSMENT: 'harassment',
  MENTAL_HEALTH: 'mental_health',
  DISCRIMINATION: 'discrimination',
  LECTURER_BEHAVIOR: 'lecturer_behavior',
  OTHER: 'other',
};

const SEVERITY_TO_PRISMA: Record<ComplaintSeverity, PrismaComplaintSeverity> = {
  LOW: PrismaComplaintSeverity.LOW,
  MED: PrismaComplaintSeverity.MED,
  HIGH: PrismaComplaintSeverity.HIGH,
  CRITICAL: PrismaComplaintSeverity.CRITICAL,
};

const STATUS_TO_PRISMA: Record<ComplaintStatus, PrismaComplaintStatus> = {
  NEW: PrismaComplaintStatus.NEW,
  IN_REVIEW: PrismaComplaintStatus.IN_REVIEW,
  NEED_MORE_INFO: PrismaComplaintStatus.NEED_MORE_INFO,
  ACTION_TAKEN: PrismaComplaintStatus.ACTION_TAKEN,
  CLOSED: PrismaComplaintStatus.CLOSED,
};

const TEAM_TO_PRISMA: Record<AssignmentTeam, PrismaAssignmentTeam> = {
  GRIEVANCE: PrismaAssignmentTeam.GRIEVANCE,
  DISCIPLINE: PrismaAssignmentTeam.DISCIPLINE,
  COUNSELING: PrismaAssignmentTeam.COUNSELING,
};

const ROLE_TO_PRISMA: Record<StaffRole, PrismaStaffRole> = {
  GRIEVANCE: PrismaStaffRole.GRIEVANCE,
  DISCIPLINE: PrismaStaffRole.DISCIPLINE,
  COUNSELOR: PrismaStaffRole.COUNSELOR,
  SUPER_ADMIN: PrismaStaffRole.SUPER_ADMIN,
};

@Injectable()
export class ComplaintsService implements OnModuleInit {
  private readonly recentSubmissions = new Map<
    string,
    Array<{ title: string; description: string; at: number }>
  >();
  private readonly events = new Subject<RealtimeEvent>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: SecretHashService,
    private readonly tokenService: TokenService,
    private readonly rateLimitService: RateLimitService,
    private readonly attachmentService: AttachmentService,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
    await this.seedCases();
  }

  getEventStream(): Observable<RealtimeEvent> {
    return this.events.asObservable();
  }

  async createComplaint(input: CreateComplaintInput, ipAddress: string) {
    const limit = await this.rateLimitService.consume(`submit:${ipAddress}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      throw new HttpException('Complaint submission limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!input.consent) {
      throw new BadRequestException('Consent is required');
    }

    const spamSignalsDetected = this.checkSpam(ipAddress, input.title, input.description);

    const validatedAttachments = (input.attachments ?? []).map((attachment) =>
      this.attachmentService.validateAttachment(attachment),
    );
    const severity = classifySeverity(`${input.title} ${input.description}`);
    const secret = generateSecret();
    const secretHash = await this.hashService.hash(secret);
    const assignedTeam = this.getTeamForCase(input.category, severity, false);
    const anonId = await this.generateUniqueAnonId();
    const counselorMessageRequired = severity === 'CRITICAL';

    const createdCase = await this.prisma.$transaction(async (tx) => {
      const assignedUser = await this.findAssignee(tx, assignedTeam);
      const created = await tx.case.create({
        data: {
          anonId,
          secretHash,
          title: input.title.trim(),
          category: CATEGORY_TO_PRISMA[input.category],
          description: input.description.trim(),
          severity: SEVERITY_TO_PRISMA[severity],
          status:
            severity === 'CRITICAL'
              ? PrismaComplaintStatus.IN_REVIEW
              : PrismaComplaintStatus.NEW,
          locationText: input.locationText?.trim() || null,
          incidentAt: input.incidentAt ? new Date(input.incidentAt) : null,
          peopleInvolved: input.peopleInvolved?.trim() || null,
          counselingRequested: counselorMessageRequired,
          identityDisclosed: false,
          captchaRequired:
            (limit.requiresChallenge || spamSignalsDetected) && !input.challengeToken,
        },
      });

      const initialMessage = await tx.message.create({
        data: {
          caseId: created.id,
          senderType: MessageSenderType.STUDENT,
          body: created.description,
        },
      });

      if (validatedAttachments.length > 0) {
        await tx.attachment.createMany({
          data: validatedAttachments.map((attachment) => ({
            caseId: created.id,
            messageId: initialMessage.id,
            storageKey: `complaints/${created.id}/${makeId('file')}-${attachment.originalName}`,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            originalName: attachment.originalName,
            scanStatus: AttachmentScanStatus.PENDING,
          })),
        });
      }

      await tx.assignment.create({
        data: {
          caseId: created.id,
          assignedToUserId: assignedUser.id,
          assignedTeam: TEAM_TO_PRISMA[assignedTeam],
        },
      });

      if (counselorMessageRequired) {
        await tx.message.create({
          data: {
            caseId: created.id,
            senderType: MessageSenderType.COUNSELOR,
            body:
              'If you are in immediate danger, contact emergency support first. When safe, reply here if you want a private meeting request logged.',
          },
        });
      }

      return created;
    });

    if (severity === 'CRITICAL') {
      this.publishEvent('case.critical.alert', createdCase.id, {
        anonId: createdCase.anonId,
        title: createdCase.title,
      });
    }

    const session = this.tokenService.sign(
      { type: 'case', sub: createdCase.id, anonId: createdCase.anonId },
      12 * 60 * 60,
    );

    return {
      anonId: createdCase.anonId,
      secret,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      complaint: await this.getPublicCase(createdCase.id),
      challengeRequired: createdCase.captchaRequired,
      emergencyResources: severity === 'CRITICAL' ? EMERGENCY_RESOURCES : [],
    };
  }

  async reconnect(input: ReconnectInput, ipAddress: string) {
    const limit = await this.rateLimitService.consume(`reconnect:${ipAddress}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      throw new HttpException('Reconnect limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    const record = await this.prisma.case.findUnique({
      where: { anonId: input.anonId },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid anonymous ID or secret');
    }

    const validSecret = await this.hashService.verify(record.secretHash, input.secret);
    if (!validSecret) {
      throw new UnauthorizedException('Invalid anonymous ID or secret');
    }

    const session = this.tokenService.sign(
      { type: 'case', sub: record.id, anonId: record.anonId },
      12 * 60 * 60,
    );

    return {
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      complaint: await this.getPublicCase(record.id),
    };
  }

  async getPublicCaseForSession(session: CaseSession) {
    await this.assertCaseSession(session);
    return this.getPublicCase(session.caseId);
  }

  async getPublicMessagesForSession(session: CaseSession) {
    await this.assertCaseSession(session);
    return this.getMessagesWithAttachments(session.caseId);
  }

  async postPublicMessage(
    session: CaseSession,
    input: PublicMessageInput,
    ipAddress: string,
  ) {
    await this.assertCaseSession(session);
    if (!input.body.trim()) {
      throw new BadRequestException('Message body is required');
    }

    const attachments = (input.attachments ?? []).map((attachment) =>
      this.attachmentService.validateAttachment(attachment),
    );
    const currentTotalBytes = await this.getCaseAttachmentBytes(session.caseId);
    attachments.forEach((attachment) =>
      this.attachmentService.ensureCaseQuota(currentTotalBytes, attachment.sizeBytes),
    );

    const existing = await this.requireCase(session.caseId);

    await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          caseId: session.caseId,
          senderType: MessageSenderType.STUDENT,
          body: input.body.trim(),
        },
      });

      if (attachments.length > 0) {
        await tx.attachment.createMany({
          data: attachments.map((attachment) => ({
            caseId: session.caseId,
            messageId: message.id,
            storageKey: `complaints/${session.caseId}/${makeId('file')}-${attachment.originalName}`,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            originalName: attachment.originalName,
            scanStatus: AttachmentScanStatus.PENDING,
          })),
        });
      }

      await tx.case.update({
        where: { id: session.caseId },
        data: {
          updatedAt: new Date(),
          status:
            existing.status === PrismaComplaintStatus.NEW
              ? PrismaComplaintStatus.IN_REVIEW
              : undefined,
          counselingRequested: input.requestCounseling ? true : undefined,
        },
      });

      if (input.requestCounseling) {
        const assignedUser = await this.findAssignee(tx, 'COUNSELING');
        await tx.assignment.create({
          data: {
            caseId: session.caseId,
            assignedToUserId: assignedUser.id,
            assignedTeam: PrismaAssignmentTeam.COUNSELING,
          },
        });
      }
    });

    if (existing.status === PrismaComplaintStatus.NEW) {
      this.publishEvent('case.status.updated', session.caseId, { status: 'IN_REVIEW' });
    }
    this.publishEvent('case.message.created', session.caseId, { senderType: 'STUDENT' });

    return {
      complaint: await this.getPublicCase(session.caseId),
      messages: await this.getMessagesWithAttachments(session.caseId),
      challengeRequired: (
        await this.rateLimitService.consume(`message:${ipAddress}`, 25, 60 * 60 * 1000)
      ).requiresChallenge,
    };
  }

  async presignAttachment(session: CaseSession, input: AttachmentInput) {
    await this.assertCaseSession(session);
    const validated = this.attachmentService.validateAttachment(input);
    this.attachmentService.ensureCaseQuota(
      await this.getCaseAttachmentBytes(session.caseId),
      validated.sizeBytes,
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        caseId: session.caseId,
        storageKey: `complaints/${session.caseId}/${makeId('file')}-${validated.originalName}`,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        originalName: validated.originalName,
        scanStatus: AttachmentScanStatus.PENDING,
      },
    });

    return {
      attachment: this.mapAttachment(attachment),
      ...this.attachmentService.createSignedUpload(attachment.storageKey),
      scanStatus: 'pending',
    };
  }

  async discloseIdentity(session: CaseSession, input: IdentityDisclosureInput) {
    await this.assertCaseSession(session);
    if (!input.name && !input.phone && !input.email && !input.notes) {
      throw new BadRequestException('At least one disclosure field is required');
    }

    const disclosure = await this.prisma.$transaction(async (tx) => {
      const created = await tx.identityDisclosure.create({
        data: {
          caseId: session.caseId,
          name: input.name?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          notes: input.notes?.trim() || null,
        },
      });

      await tx.case.update({
        where: { id: session.caseId },
        data: {
          identityDisclosed: true,
          optionalContactInfo: {
            name: created.name,
            phone: created.phone,
            email: created.email,
            notes: created.notes,
          },
        },
      });

      return created;
    });

    return {
      complaint: await this.getPublicCase(session.caseId),
      disclosure: this.mapDisclosure(disclosure),
    };
  }

  async loginAdmin(input: StaffLoginInput) {
    const user = await this.prisma.staffUser.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid staff credentials');
    }

    const validPassword = await this.hashService.verify(user.passwordHash, input.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid staff credentials');
    }

    const token = this.tokenService.sign(
      { type: 'admin', sub: user.id, role: user.role },
      8 * 60 * 60,
    );

    return {
      token: token.token,
      expiresAt: token.expiresAt,
      user: this.toPublicUser(user),
    };
  }

  async getOverview() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalCases,
      newCases,
      criticalCases,
      needMoreInfo,
      closedThisWeek,
      recentActivity,
      criticalAlerts,
    ] = await Promise.all([
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: PrismaComplaintStatus.NEW } }),
      this.prisma.case.count({ where: { severity: PrismaComplaintSeverity.CRITICAL } }),
      this.prisma.case.count({ where: { status: PrismaComplaintStatus.NEED_MORE_INFO } }),
      this.prisma.case.count({
        where: {
          status: PrismaComplaintStatus.CLOSED,
          updatedAt: { gte: weekAgo },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { actorUserId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.case.findMany({
        where: { severity: PrismaComplaintSeverity.CRITICAL },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalCases,
      newCases,
      criticalCases,
      needMoreInfo,
      closedThisWeek,
      recentActivity: recentActivity.map((item) => this.mapAudit(item)),
      criticalAlerts: criticalAlerts.map((item) => this.mapCase(item, undefined)),
    };
  }

  async listAdminCases(filters: AdminCaseFilters) {
    const records = await this.prisma.case.findMany({
      where: {
        status: filters.status ? STATUS_TO_PRISMA[filters.status] : undefined,
        category: filters.category ? CATEGORY_TO_PRISMA[filters.category] : undefined,
        severity: filters.severity ? SEVERITY_TO_PRISMA[filters.severity] : undefined,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      include: {
        assignments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records
      .filter((item) =>
        filters.assignedTeam
          ? item.assignments[0]?.assignedTeam === TEAM_TO_PRISMA[filters.assignedTeam]
          : true,
      )
      .map((item) => this.mapCase(item, item.assignments[0]?.assignedTeam));
  }

  async getAdminCase(caseId: string, admin: AdminIdentity, ipAddress: string): Promise<AdminCaseDetail> {
    await this.addAuditLog(admin.id, 'view', caseId, { scope: 'case_detail' }, ipAddress);
    const bundle = await this.requireCaseBundle(caseId);
    return this.mapAdminCaseDetail(bundle);
  }

  async updateStatus(
    caseId: string,
    status: ComplaintStatus,
    reason: string,
    admin: AdminIdentity,
    ipAddress: string,
  ) {
    await this.requireCase(caseId);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.case.findUniqueOrThrow({ where: { id: caseId } });
      await tx.case.update({
        where: { id: caseId },
        data: {
          status: STATUS_TO_PRISMA[status],
          updatedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'status_change',
          caseId,
          meta: { from: current.status, to: STATUS_TO_PRISMA[status], reason },
          ipAddress,
        },
      });
    });

    this.publishEvent('case.status.updated', caseId, { status });
    return this.getAdminCase(caseId, admin, ipAddress);
  }

  async assignCase(
    caseId: string,
    input: { assignedToUserId: string; assignedTeam: AssignmentTeam },
    admin: AdminIdentity,
    ipAddress: string,
  ) {
    await this.requireCase(caseId);
    await this.requireUser(input.assignedToUserId);

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          caseId,
          assignedToUserId: input.assignedToUserId,
          assignedTeam: TEAM_TO_PRISMA[input.assignedTeam],
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'assignment',
          caseId,
          meta: {
            assignedToUserId: input.assignedToUserId,
            assignedTeam: input.assignedTeam,
          },
          ipAddress,
        },
      });
      return created;
    });

    this.publishEvent('case.assignment.updated', caseId, {
      assignedToUserId: input.assignedToUserId,
      assignedTeam: input.assignedTeam,
    });

    return this.mapAssignment(assignment);
  }

  async sendAdminMessage(
    caseId: string,
    input: { body: string; senderType?: 'STAFF' | 'COUNSELOR' },
    admin: AdminIdentity,
    ipAddress: string,
  ) {
    await this.requireCase(caseId);
    if (!input.body.trim()) {
      throw new BadRequestException('Message body is required');
    }

    const senderType =
      input.senderType ??
      (admin.role === 'COUNSELOR' ? MessageSenderType.COUNSELOR : MessageSenderType.STAFF);

    await this.prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: {
          caseId,
          senderType,
          body: input.body.trim(),
        },
      });
      await tx.case.update({
        where: { id: caseId },
        data: { updatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'message',
          caseId,
          meta: { senderType },
          ipAddress,
        },
      });
    });

    this.publishEvent('case.message.created', caseId, { senderType });
    return this.getMessagesWithAttachments(caseId);
  }

  async addInternalNote(caseId: string, body: string, admin: AdminIdentity, ipAddress: string) {
    await this.requireCase(caseId);
    if (!body.trim()) {
      throw new BadRequestException('Internal note body is required');
    }

    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.internalNote.create({
        data: {
          caseId,
          authorUserId: admin.id,
          body: body.trim(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'internal_note',
          caseId,
          meta: { bodyLength: body.trim().length },
          ipAddress,
        },
      });
      return created;
    });

    return this.mapInternalNote(note);
  }

  async listAudit(filters: AuditFilters) {
    const records = await this.prisma.auditLog.findMany({
      where: {
        caseId: filters.caseId,
        actorUserId: filters.actorUserId,
        action: filters.action,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((item) => this.mapAudit(item));
  }

  async listUsers() {
    const users = await this.prisma.staffUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async createUser(input: CreateStaffUserInput, admin: AdminIdentity, ipAddress: string) {
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.staffUser.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: await this.hashService.hash(input.password),
          role: ROLE_TO_PRISMA[input.role],
          isActive: input.isActive ?? true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'user_create',
          meta: { email: user.email, role: user.role },
          ipAddress,
        },
      });
      return user;
    });

    return this.toPublicUser(created);
  }

  async getUser(userId: string) {
    return this.toPublicUser(await this.requireUser(userId));
  }

  async updateUser(
    userId: string,
    input: UpdateStaffUserInput,
    admin: AdminIdentity,
    ipAddress: string,
  ) {
    await this.requireUser(userId);

    const data: Prisma.StaffUserUpdateInput = {
      email: input.email?.toLowerCase(),
      role: input.role ? ROLE_TO_PRISMA[input.role] : undefined,
      isActive: input.isActive,
      updatedAt: new Date(),
    };
    if (input.password) {
      data.passwordHash = await this.hashService.hash(input.password);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.staffUser.update({
        where: { id: userId },
        data,
      });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'user_update',
          meta: {
            userId,
            email: input.email,
            role: input.role,
            isActive: input.isActive,
          },
          ipAddress,
        },
      });
      return user;
    });

    return this.toPublicUser(updated);
  }

  async deleteUser(userId: string, admin: AdminIdentity, ipAddress: string) {
    const user = await this.requireUser(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.staffUser.delete({ where: { id: userId } });
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: 'user_delete',
          meta: { userId, email: user.email },
          ipAddress,
        },
      });
    });

    return { success: true };
  }

  async createAttachmentDownload(
    caseId: string,
    attachmentId: string,
    admin: AdminIdentity,
    ipAddress: string,
  ): Promise<AttachmentDownload> {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, caseId },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.addAuditLog(
      admin.id,
      'download_attachment',
      caseId,
      { attachmentId, originalName: attachment.originalName },
      ipAddress,
    );

    return {
      attachmentId,
      ...this.attachmentService.createSignedDownload(attachment.storageKey),
    };
  }

  private async seedUsers() {
    const defaults: CreateStaffUserInput[] = [
      { email: 'grievance@unilocate.edu', password: 'Grievance#123', role: 'GRIEVANCE' },
      { email: 'discipline@unilocate.edu', password: 'Discipline#123', role: 'DISCIPLINE' },
      { email: 'counselor@unilocate.edu', password: 'Counselor#123', role: 'COUNSELOR' },
      { email: 'superadmin@unilocate.edu', password: 'SuperAdmin#123', role: 'SUPER_ADMIN' },
    ];

    for (const user of defaults) {
      const existing = await this.prisma.staffUser.findUnique({
        where: { email: user.email },
      });
      if (existing) {
        continue;
      }

      await this.prisma.staffUser.create({
        data: {
          email: user.email,
          passwordHash: await this.hashService.hash(user.password),
          role: ROLE_TO_PRISMA[user.role],
          isActive: true,
        },
      });
    }
  }

  private async seedCases() {
    const count = await this.prisma.case.count();
    if (count > 0) {
      return;
    }

    await this.createComplaint(
      {
        title: 'Repeated ragging in hostel corridor',
        category: 'ragging',
        description:
          'Senior students are forcing juniors to gather late at night and threatening them if they refuse.',
        locationText: 'Hostel block C',
        incidentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        peopleInvolved: 'A small group of seniors from the same hostel floor.',
        consent: true,
        attachments: [
          {
            originalName: 'corridor-photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 120400,
          },
        ],
      },
      '127.0.0.1',
    );

    await this.createComplaint(
      {
        title: 'I feel unsafe and keep thinking about self-harm',
        category: 'mental_health',
        description:
          'I feel unsafe and overwhelmed after repeated harassment. I have been thinking about self-harm and need urgent support.',
        locationText: 'Near library entrance',
        incidentAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        consent: true,
      },
      '127.0.0.1',
    );
  }

  private async generateUniqueAnonId() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existingIds = await this.prisma.case.findMany({
        select: { anonId: true },
      });
      const candidate = generateAnonId(existingIds.map((item) => item.anonId));
      const existing = await this.prisma.case.findUnique({
        where: { anonId: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Unable to generate a unique anonymous ID');
  }

  private checkSpam(ipAddress: string, title: string, description: string) {
    const now = Date.now();
    const bucket = this.recentSubmissions.get(ipAddress) ?? [];
    const normalizedTitle = title.trim().toLowerCase();
    const normalizedDescription = description.trim().toLowerCase();
    const recent = bucket.filter((entry) => now - entry.at < 15 * 60 * 1000);
    const duplicates = recent.filter(
      (entry) => entry.title === normalizedTitle && entry.description === normalizedDescription,
    );
    const urlCount = (description.match(/https?:\/\//g) ?? []).length;
    const challengeRequired = duplicates.length >= 2 || urlCount >= 5;

    recent.push({ title: normalizedTitle, description: normalizedDescription, at: now });
    this.recentSubmissions.set(ipAddress, recent);
    return challengeRequired;
  }

  private async requireCase(caseId: string) {
    const record = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!record) {
      throw new NotFoundException('Case not found');
    }

    return record;
  }

  private async assertCaseSession(session: CaseSession) {
    const record = await this.requireCase(session.caseId);
    if (record.anonId !== session.anonId) {
      throw new UnauthorizedException('Invalid case session');
    }
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.staffUser.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    return user;
  }

  private async requireCaseBundle(caseId: string) {
    const bundle = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        messages: {
          include: { attachments: true },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
        },
        disclosures: {
          orderBy: { createdAt: 'desc' },
        },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!bundle) {
      throw new NotFoundException('Case not found');
    }

    return bundle;
  }

  private async getPublicCase(caseId: string) {
    const bundle = await this.requireCaseBundle(caseId);
    return {
      ...this.mapCase(bundle, bundle.assignments[0]?.assignedTeam),
      attachments: bundle.attachments.map((attachment) => this.mapAttachment(attachment)),
      messages: bundle.messages.map((message) => this.mapMessage(message)),
      timeline: this.buildTimeline(bundle),
    };
  }

  private async getMessagesWithAttachments(caseId: string) {
    const messages = await this.prisma.message.findMany({
      where: { caseId },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((message) => this.mapMessage(message));
  }

  private async getCaseAttachmentBytes(caseId: string) {
    const aggregate = await this.prisma.attachment.aggregate({
      where: { caseId },
      _sum: { sizeBytes: true },
    });
    return aggregate._sum.sizeBytes ?? 0;
  }

  private async findAssignee(tx: Prisma.TransactionClient, assignedTeam: AssignmentTeam) {
    const targetRole =
      assignedTeam === 'COUNSELING'
        ? PrismaStaffRole.COUNSELOR
        : assignedTeam === 'DISCIPLINE'
          ? PrismaStaffRole.DISCIPLINE
          : PrismaStaffRole.GRIEVANCE;

    const user = await tx.staffUser.findFirst({
      where: { role: targetRole, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) {
      throw new BadRequestException(`No active ${assignedTeam.toLowerCase()} assignee available`);
    }

    return user;
  }

  private mapCase(
    record: Case,
    assignedTeam?: PrismaAssignmentTeam,
  ): CaseRecord & { assignedTeam?: AssignmentTeam } {
    return {
      id: record.id,
      anonId: record.anonId,
      secretHash: record.secretHash,
      title: record.title,
      category: CATEGORY_FROM_PRISMA[record.category],
      description: record.description,
      severity: record.severity,
      status: record.status,
      location: undefined,
      locationText: record.locationText ?? undefined,
      incidentAt: record.incidentAt?.toISOString(),
      peopleInvolved: record.peopleInvolved ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      counselingRequested: record.counselingRequested,
      identityDisclosed: record.identityDisclosed,
      captchaRequired: record.captchaRequired,
      assignedTeam: assignedTeam as AssignmentTeam | undefined,
    };
  }

  private mapMessage(
    message: Message & { attachments?: Array<Prisma.AttachmentUncheckedCreateInput & any> },
  ): MessageRecord & { attachments: AttachmentRecord[] } {
    return {
      id: message.id,
      caseId: message.caseId,
      senderType: message.senderType,
      senderLabel:
        message.senderType === MessageSenderType.COUNSELOR
          ? 'Counselor'
          : message.senderType === MessageSenderType.STUDENT
            ? 'Student'
            : 'Staff',
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      attachments: (message.attachments ?? []).map((attachment: any) =>
        this.mapAttachment(attachment),
      ),
    };
  }

  private mapAttachment(attachment: {
    id: string;
    caseId: string;
    messageId: string | null;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
    scanStatus: AttachmentScanStatus;
    createdAt: Date;
    updatedAt: Date;
  }): AttachmentRecord {
    return {
      id: attachment.id,
      caseId: attachment.caseId,
      messageId: attachment.messageId ?? undefined,
      storageKey: attachment.storageKey,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      originalName: attachment.originalName,
      scanStatus: attachment.scanStatus.toLowerCase() as AttachmentRecord['scanStatus'],
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString(),
    };
  }

  private mapAssignment(assignment: {
    id: string;
    caseId: string;
    assignedToUserId: string;
    assignedTeam: PrismaAssignmentTeam;
    createdAt: Date;
    updatedAt: Date;
  }): AssignmentRecord {
    return {
      id: assignment.id,
      caseId: assignment.caseId,
      assignedToUserId: assignment.assignedToUserId,
      assignedTeam: assignment.assignedTeam as AssignmentTeam,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }

  private mapDisclosure(disclosure: IdentityDisclosure): IdentityDisclosureRecord {
    return {
      id: disclosure.id,
      caseId: disclosure.caseId,
      name: disclosure.name ?? undefined,
      phone: disclosure.phone ?? undefined,
      email: disclosure.email ?? undefined,
      notes: disclosure.notes ?? undefined,
      createdAt: disclosure.createdAt.toISOString(),
      updatedAt: disclosure.updatedAt.toISOString(),
    };
  }

  private mapInternalNote(note: InternalNote): InternalNoteRecord {
    return {
      id: note.id,
      caseId: note.caseId,
      authorUserId: note.authorUserId,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private mapAudit(log: AuditLog): AuditLogRecord {
    return {
      id: log.id,
      actorUserId: log.actorUserId ?? undefined,
      action: log.action as AuditAction,
      caseId: log.caseId ?? undefined,
      meta: (log.meta ?? {}) as Record<string, unknown>,
      ipAddress: log.ipAddress ?? undefined,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private mapAdminCaseDetail(bundle: CaseBundle): AdminCaseDetail {
    return {
      case: this.mapCase(bundle, bundle.assignments[0]?.assignedTeam),
      messages: bundle.messages.map((message) => this.mapMessage(message)),
      attachments: bundle.attachments.map((attachment) => this.mapAttachment(attachment)),
      assignments: bundle.assignments.map((assignment) => this.mapAssignment(assignment)),
      auditLogs: bundle.auditLogs.map((log) => this.mapAudit(log)),
      internalNotes: bundle.internalNotes.map((note) => this.mapInternalNote(note)),
      disclosures: bundle.disclosures.map((disclosure) => this.mapDisclosure(disclosure)),
      timeline: this.buildTimeline(bundle),
    };
  }

  private buildTimeline(bundle: CaseBundle): TimelineItem[] {
    const items: TimelineItem[] = [
      {
        id: `created-${bundle.id}`,
        title: 'Complaint received',
        description:
          bundle.severity === PrismaComplaintSeverity.CRITICAL
            ? 'Critical language detected. Counselor-aware review was triggered immediately.'
            : 'Your anonymous complaint was submitted successfully.',
        createdAt: bundle.createdAt.toISOString(),
      },
      ...bundle.auditLogs
        .filter((log) => log.action === 'status_change' || log.action === 'assignment')
        .map((log) => ({
          id: log.id,
          title:
            log.action === 'status_change'
              ? `Status changed to ${String((log.meta as any)?.to ?? bundle.status).replaceAll('_', ' ')}`
              : 'Case assignment updated',
          description:
            log.action === 'status_change'
              ? String((log.meta as any)?.reason ?? 'Status was updated.')
              : `Assigned to ${String((log.meta as any)?.assignedTeam ?? 'team').toLowerCase()}.`,
          createdAt: log.createdAt.toISOString(),
        })),
      ...bundle.disclosures.map((disclosure) => ({
        id: disclosure.id,
        title: 'Identity disclosure submitted',
        description: 'Optional contact information was shared for a private follow-up path.',
        createdAt: disclosure.createdAt.toISOString(),
      })),
    ];

    if (bundle.counselingRequested) {
      items.push({
        id: `counseling-${bundle.id}`,
        title: 'Counseling follow-up requested',
        description: 'The case has been flagged for counselor attention.',
        createdAt: bundle.updatedAt.toISOString(),
      });
    }

    return items.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  private toPublicUser(user: StaffUser | StaffUserRecord) {
    return {
      id: user.id,
      email: user.email,
      role: user.role as StaffRole,
      isActive: user.isActive,
      createdAt: new Date(user.createdAt).toISOString(),
      updatedAt: new Date(user.updatedAt).toISOString(),
    };
  }

  private getTeamForCase(
    category: ComplaintCategory,
    severity: ComplaintSeverity,
    counselingRequested: boolean,
  ): AssignmentTeam {
    if (counselingRequested || severity === 'CRITICAL' || category === 'mental_health') {
      return 'COUNSELING';
    }
    if (category === 'ragging') {
      return 'DISCIPLINE';
    }
    return 'GRIEVANCE';
  }

  private async addAuditLog(
    actorUserId: string | undefined,
    action: AuditAction,
    caseId: string | undefined,
    meta: Prisma.InputJsonValue,
    ipAddress: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action,
        caseId: caseId ?? null,
        meta,
        ipAddress,
      },
    });
  }

  private publishEvent(
    type: RealtimeEvent['type'],
    caseId: string,
    payload: Record<string, unknown>,
  ) {
    this.events.next({
      type,
      caseId,
      payload,
      createdAt: new Date().toISOString(),
    });
  }
}
