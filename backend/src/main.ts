import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { formatDevServerUrls } from './common/utils/network-address.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for web and mobile clients (handles preflight OPTIONS)
  const configService = app.get(ConfigService);
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:49954',
  ];
  const envOrigins = configService
    .get<string>('FRONTEND_ORIGINS')
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));

  const port = configService.get<number>('PORT') ?? 3000;
  const host = configService.get<string>('HOST') ?? '0.0.0.0';

  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(formatDevServerUrls(port));
}
bootstrap();
