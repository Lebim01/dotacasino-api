import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRoles } from '../auth.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoles[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles) {
      const request = context.switchToHttp().getRequest();
      const hasRole = request.user.roles.some((role: UserRoles) =>
        requiredRoles.includes(role),
      );
      if (!hasRole)
        throw new HttpException('UNAUTHORIZED', 403, {
          cause: new Error('User does not have the required roles'),
        });
    }

    return true;
  }
}
