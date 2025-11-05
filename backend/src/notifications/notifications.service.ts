import { Injectable, Logger } from '@nestjs/common';

export interface NotificationPayload {
  type: string;
  userId: string;
  data: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendNotification(payload: NotificationPayload): Promise<void> {
    this.logger.debug(`Notification stub -> ${payload.type} for user ${payload.userId}`);
  }
}
