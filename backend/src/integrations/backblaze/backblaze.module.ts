import { DynamicModule, Module, Provider } from '@nestjs/common';
import { BACKBLAZE_MODULE_OPTIONS } from './backblaze.constants';
import {
  BackblazeModuleAsyncOptions,
  BackblazeModuleOptions,
  BackblazeOptionsFactory,
} from './backblaze.interfaces';
import { BackblazeService } from './backblaze.service';

@Module({})
export class BackblazeModule {
  static forRoot(options: BackblazeModuleOptions): DynamicModule {
    return {
      module: BackblazeModule,
      providers: [
        { provide: BACKBLAZE_MODULE_OPTIONS, useValue: options },
        BackblazeService,
      ],
      exports: [BackblazeService],
    };
  }

  static forRootAsync(options: BackblazeModuleAsyncOptions): DynamicModule {
    const providers = this.createAsyncProviders(options);

    return {
      module: BackblazeModule,
      imports: options.imports ?? [],
      providers: [...providers, BackblazeService],
      exports: [BackblazeService],
    };
  }

  private static createAsyncProviders(
    options: BackblazeModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: BACKBLAZE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ? [...options.inject] : [],
        },
      ];
    }

    const useClass = options.useClass || options.useExisting;
    if (!useClass) {
      throw new Error('Invalid BackblazeModule configuration.');
    }

    return [
      {
        provide: BACKBLAZE_MODULE_OPTIONS,
        async useFactory(factory: BackblazeOptionsFactory) {
          return factory.createBackblazeOptions();
        },
        inject: [useClass],
      },
      ...(options.useClass ? [{ provide: useClass, useClass }] : []),
    ];
  }
}
