import { SetMetadata } from '@nestjs/common';
import { UserRoles } from '../auth.constants';

export const HasRoles = (...roles: UserRoles[]) => SetMetadata('roles', roles);
