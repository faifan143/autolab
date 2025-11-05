import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const client = context.switchToWs().getClient<Socket & { handshake: any }>();
    const handshake = client.handshake ?? {};

    handshake.headers = handshake.headers ?? {};
    if (!handshake.headers.authorization) {
      const token = handshake.query?.token || handshake.headers?.token;
      if (token) {
        const tokenString = Array.isArray(token) ? token[0] : token;
        handshake.headers.authorization = tokenString.startsWith('Bearer ')
          ? tokenString
          : `Bearer ${tokenString}`;
      }
    }

    return handshake;
  }

  async canActivate(context: ExecutionContext) {
    const can = (await super.canActivate(context)) as boolean;
    const client = context.switchToWs().getClient<any>();
    const handshake = client.handshake ?? {};
    if (handshake.user) {
      client.data = client.data ?? {};
      client.data.user = handshake.user;
    }
    return can;
  }
}
