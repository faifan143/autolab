import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (context.getType<'http' | 'ws'>() === 'ws') {
      const client = context.switchToWs().getClient<any>();
      const user = client?.data?.user ?? client?.handshake?.user;
      return Boolean(user && requiredRoles.includes(user.role));
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return Boolean(user && requiredRoles.includes(user.role));
  }
}
