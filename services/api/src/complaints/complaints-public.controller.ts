import { Body, Controller, Get, Post, Req, Sse, UseGuards } from '@nestjs/common';
import { filter, map } from 'rxjs/operators';

import { ComplaintsService } from './complaints.service';
import type {
  AttachmentInput,
  CreateComplaintInput,
  IdentityDisclosureInput,
  PublicMessageInput,
  ReconnectInput,
} from './complaints.types';
import { CaseSessionGuard } from './guards/case-session.guard';

@Controller('api/public/cases')
export class ComplaintsPublicController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  createCase(@Body() body: CreateComplaintInput, @Req() request: any) {
    return this.complaintsService.createComplaint(body, this.getIp(request));
  }

  @Post('reconnect')
  reconnect(@Body() body: ReconnectInput, @Req() request: any) {
    return this.complaintsService.reconnect(body, this.getIp(request));
  }

  @UseGuards(CaseSessionGuard)
  @Get('me')
  getMyCase(@Req() request: any) {
    return this.complaintsService.getPublicCaseForSession(request.caseSession);
  }

  @UseGuards(CaseSessionGuard)
  @Get('me/messages')
  getMyMessages(@Req() request: any) {
    return this.complaintsService.getPublicMessagesForSession(request.caseSession);
  }

  @UseGuards(CaseSessionGuard)
  @Post('me/messages')
  postMyMessage(@Body() body: PublicMessageInput, @Req() request: any) {
    return this.complaintsService.postPublicMessage(
      request.caseSession,
      body,
      this.getIp(request),
    );
  }

  @UseGuards(CaseSessionGuard)
  @Post('me/attachments/presign')
  presignAttachment(@Body() body: AttachmentInput, @Req() request: any) {
    return this.complaintsService.presignAttachment(request.caseSession, body);
  }

  @UseGuards(CaseSessionGuard)
  @Post('me/identity-disclosure')
  discloseIdentity(@Body() body: IdentityDisclosureInput, @Req() request: any) {
    return this.complaintsService.discloseIdentity(request.caseSession, body);
  }

  @UseGuards(CaseSessionGuard)
  @Sse('me/events')
  events(@Req() request: any) {
    return this.complaintsService.getEventStream().pipe(
      filter((event) => event.caseId === request.caseSession.caseId),
      map((event) => ({ data: event })),
    );
  }

  private getIp(request: any) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return request.ip ?? '127.0.0.1';
  }
}
