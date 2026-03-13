import { Body, Controller, Post } from '@nestjs/common';

import { ComplaintsService } from './complaints.service';
import type { StaffLoginInput } from './complaints.types';

@Controller('api/admin/auth')
export class ComplaintsAuthController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post('login')
  login(@Body() body: StaffLoginInput) {
    return this.complaintsService.loginAdmin(body);
  }
}
