import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';

/**
 * Permite acceso si NO hay @Roles() en el handler,
 * o si el usuario tiene AL MENOS UNO de los roles requeridos.
 * Requiere que JwtAuthGuard haya poblado req.user.roles (string[])
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no se declaró @Roles(), la ruta no requiere rol específico
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { userId: string; email: string; roles?: string[] }
      | undefined;
    const userRoles = (user?.roles ?? ['user']).map((r) => r.toLowerCase());

    // al menos un rol requerido debe existir en el usuario
    return required.some((role) => userRoles.includes(role.toLowerCase()));
  }
}
