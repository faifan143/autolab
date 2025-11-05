import { ModuleMetadata, Type } from '@nestjs/common';

export interface FirebaseNotificationsCredentials {
  projectId?: string;
  clientEmail: string;
  privateKey: string;
}

export interface FirebaseNotificationsModuleOptions {
  appName?: string;
  credential: FirebaseNotificationsCredentials;
  defaultTtlSeconds?: number;
}

export interface FirebaseNotificationsOptionsFactory {
  createFirebaseNotificationsOptions():
    | Promise<FirebaseNotificationsModuleOptions>
    | FirebaseNotificationsModuleOptions;
}

export interface FirebaseNotificationsModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<FirebaseNotificationsOptionsFactory>;
  useClass?: Type<FirebaseNotificationsOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<FirebaseNotificationsModuleOptions> | FirebaseNotificationsModuleOptions;
  inject?: any[];
}
