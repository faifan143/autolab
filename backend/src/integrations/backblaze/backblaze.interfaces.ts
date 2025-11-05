import { ModuleMetadata, Type } from '@nestjs/common';

export interface BackblazeModuleOptions {
  endpoint: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
  region?: string;
  forcePathStyle?: boolean;
}

export interface BackblazeOptionsFactory {
  createBackblazeOptions(): Promise<BackblazeModuleOptions> | BackblazeModuleOptions;
}

export interface BackblazeModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<BackblazeOptionsFactory>;
  useClass?: Type<BackblazeOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<BackblazeModuleOptions> | BackblazeModuleOptions;
  inject?: any[];
}
