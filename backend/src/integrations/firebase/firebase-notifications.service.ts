import { Inject, Injectable, Logger } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging';
import { FIREBASE_NOTIFICATIONS_OPTIONS } from './firebase-notifications.constants';
import type { FirebaseNotificationsModuleOptions } from './firebase-notifications.interfaces';

@Injectable()
export class FirebaseNotificationsService {
  private readonly logger = new Logger(FirebaseNotificationsService.name);
  private readonly messaging: Messaging;
  private readonly app: App;
  private readonly defaultTtlSeconds: number;
  private readonly options: FirebaseNotificationsModuleOptions;

  constructor(@Inject(FIREBASE_NOTIFICATIONS_OPTIONS) options: FirebaseNotificationsModuleOptions) {
    this.options = options;
    const appName = options.appName ?? 'firebase-notifications';
    const existingApp = getApps().find((app) => app.name === appName);

    if (existingApp) {
      this.app = existingApp;
    } else {
      const credential = cert({
        projectId: options.credential.projectId,
        clientEmail: options.credential.clientEmail,
        privateKey: options.credential.privateKey.replace(/\\n/g, '\n'),
      });

      this.app = initializeApp({ credential }, appName);
    }

    this.messaging = getMessaging(this.app);
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 3600;
  }

  async sendMulticast(message: MulticastMessage) {
    if (!message.tokens || message.tokens.length === 0) {
      this.logger.warn('Skipping notification send: no target tokens provided');
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    const enrichedMessage: MulticastMessage = {
      ...message,
      android: {
        ttl: this.defaultTtlSeconds * 1000,
        ...(message.android ?? {}),
      },
      apns: {
        headers: {
          'apns-expiration': `${Math.floor(Date.now() / 1000 + this.defaultTtlSeconds)}`,
          ...(message.apns?.headers ?? {}),
        },
        payload: message.apns?.payload,
        fcmOptions: message.apns?.fcmOptions,
      },
    };

    const response = await this.messaging.sendEachForMulticast(enrichedMessage);

    if (response.failureCount > 0) {
      this.logger.warn(`Firebase send had ${response.failureCount} failures`);
    }

    return response;
  }
}
