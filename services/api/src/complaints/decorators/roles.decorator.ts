import { SetMetadata } from '@nestjs/common';

import type { StaffRole } from '../complaints.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
