import { DynamicModule, Module, Provider, Global } from '@nestjs/common';
import { FIREBASE_NOTIFICATIONS_OPTIONS } from './firebase-notifications.constants';
import {
  FirebaseNotificationsModuleAsyncOptions,
  FirebaseNotificationsModuleOptions,
  FirebaseNotificationsOptionsFactory,
} from './firebase-notifications.interfaces';
import { FirebaseNotificationsService } from './firebase-notifications.service';

@Global()
@Module({})
export class FirebaseNotificationsModule {
  static forRoot(options: FirebaseNotificationsModuleOptions): DynamicModule {
    return {
      module: FirebaseNotificationsModule,
      providers: [
        { provide: FIREBASE_NOTIFICATIONS_OPTIONS, useValue: options },
        FirebaseNotificationsService,
      ],
      exports: [FirebaseNotificationsService],
    };
  }

  static forRootAsync(
    options: FirebaseNotificationsModuleAsyncOptions,
  ): DynamicModule {
    const providers = this.createAsyncProviders(options);

    return {
      module: FirebaseNotificationsModule,
      imports: options.imports ?? [],
      providers: [...providers, FirebaseNotificationsService],
      exports: [FirebaseNotificationsService],
    };
  }

  private static createAsyncProviders(
    options: FirebaseNotificationsModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: FIREBASE_NOTIFICATIONS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ? [...options.inject] : [],
        },
      ];
    }

    const useClass = options.useClass || options.useExisting;

    if (!useClass) {
      throw new Error('Invalid FirebaseNotificationsModule configuration.');
    }

    return [
      {
        provide: FIREBASE_NOTIFICATIONS_OPTIONS,
        async useFactory(factory: FirebaseNotificationsOptionsFactory) {
          return factory.createFirebaseNotificationsOptions();
        },
        inject: [useClass],
      },
      ...(options.useClass ? [{ provide: useClass, useClass }] : []),
    ];
  }
}
