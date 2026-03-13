import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

import { CurrentAdmin } from './decorators/current-admin.decorator';
import { Roles } from './decorators/roles.decorator';
import { ComplaintsService } from './complaints.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { StaffRoleGuard } from './guards/staff-role.guard';

@UseGuards(AdminAuthGuard, StaffRoleGuard)
@Controller('api/admin')
export class ComplaintsAdminController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  getOverview() {
    return this.complaintsService.getOverview();
  }

  @Get('cases')
  listCases(@Query() query: Record<string, string | undefined>) {
    return this.complaintsService.listAdminCases({
      status: query.status as any,
      category: query.category as any,
      severity: query.severity as any,
      assignedTeam: query.assignedTeam as any,
      from: query.from,
      to: query.to,
    });
  }

  @Get('cases/:id')
  getCase(@Param('id') id: string, @CurrentAdmin() admin: any, @Req() request: any) {
    return this.complaintsService.getAdminCase(id, admin, this.getIp(request));
  }

  @Patch('cases/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: any; reason: string },
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.updateStatus(
      id,
      body.status,
      body.reason,
      admin,
      this.getIp(request),
    );
  }

  @Post('cases/:id/assign')
  assignCase(
    @Param('id') id: string,
    @Body() body: { assignedToUserId: string; assignedTeam: any },
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.assignCase(id, body, admin, this.getIp(request));
  }

  @Post('cases/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() body: { body: string; senderType?: 'STAFF' | 'COUNSELOR' },
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.sendAdminMessage(id, body, admin, this.getIp(request));
  }

  @Post('cases/:id/internal-notes')
  addInternalNote(
    @Param('id') id: string,
    @Body() body: { body: string },
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.addInternalNote(id, body.body, admin, this.getIp(request));
  }

  @Post('cases/:id/attachments/:attachmentId/download')
  downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.createAttachmentDownload(
      id,
      attachmentId,
      admin,
      this.getIp(request),
    );
  }

  @Roles('SUPER_ADMIN')
  @Get('audit')
  getAudit(@Query() query: Record<string, string | undefined>) {
    return this.complaintsService.listAudit({
      caseId: query.caseId,
      actorUserId: query.actorUserId,
      action: query.action as any,
      from: query.from,
      to: query.to,
    });
  }

  @Roles('SUPER_ADMIN')
  @Get('users')
  getUsers() {
    return this.complaintsService.listUsers();
  }

  @Roles('SUPER_ADMIN')
  @Post('users')
  createUser(@Body() body: any, @CurrentAdmin() admin: any, @Req() request: any) {
    return this.complaintsService.createUser(body, admin, this.getIp(request));
  }

  @Roles('SUPER_ADMIN')
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.complaintsService.getUser(id);
  }

  @Roles('SUPER_ADMIN')
  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentAdmin() admin: any,
    @Req() request: any,
  ) {
    return this.complaintsService.updateUser(id, body, admin, this.getIp(request));
  }

  @Roles('SUPER_ADMIN')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentAdmin() admin: any, @Req() request: any) {
    return this.complaintsService.deleteUser(id, admin, this.getIp(request));
  }

  @Sse('events')
  events() {
    return this.complaintsService.getEventStream().pipe(map((event) => ({ data: event })));
  }

  private getIp(request: any) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return request.ip ?? '127.0.0.1';
  }
}
