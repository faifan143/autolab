import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<any>();

    const authToken =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization;

    if (!authToken) {
      return false;
    }

    const token = String(authToken).startsWith('Bearer ')
      ? String(authToken).slice(7)
      : String(authToken);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      client.user = {
        userId: payload.sub,
        role: payload.role,
      };

      return true;
    } catch {
      return false;
    }
  }
}


