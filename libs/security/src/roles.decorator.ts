import { SetMetadata } from '@nestjs/common';
import { UserRoles } from 'apps/backoffice-api/src/auth/auth.constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoles[]) => SetMetadata(ROLES_KEY, roles);
