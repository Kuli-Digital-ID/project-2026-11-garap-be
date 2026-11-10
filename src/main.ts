import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Cukup untuk logo perusahaan (data URL, maks. 512 KB).
  app.useBodyParser('json', { limit: '1mb' });

  const configService = app.get(ConfigService);

  // Get configurations
  const swaggerEnabled = configService.get<boolean>('swagger.enabled');
  const corsOrigin = configService.get<string>('app.corsOrigin');
  const swaggerPath = configService.get<string>('swagger.path');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const port = configService.get<number>('app.port');

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Class serializer for excluding fields (like password)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Documentation
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Garap API')
      .setDescription(
        'Backend Garap — manajemen proyek untuk tim manusia & agent AI Kuli Digital. ' +
          'Login lewat SSO Keycloak (GET /api/v1/auth/sso/login); sesi disimpan di cookie httpOnly "Authentication".',
      )
      .setVersion('1.0')
      .addCookieAuth('Authentication')
      .addBearerAuth()
      .addTag('Authentication', 'Login SSO Keycloak, sesi, profil saya')
      .addTag('Members', 'Akun anggota (didaftarkan Owner/Admin)')
      .addTag('Agents', 'Agent AI, profil, dan riwayat run')
      .addTag('AI Providers', 'API key penyedia model AI (terenkripsi)')
      .addTag('Divisions', 'Divisi perusahaan')
      .addTag('Access', 'Posisi & izin')
      .addTag('Projects', 'Proyek, alur kerja, sprint, epic')
      .addTag('Tickets', 'Tiket, papan, backlog, komentar, checklist, relasi')
      .addTag('Requests', 'Permintaan lintas divisi')
      .addTag('Docs', 'Dokumen proyek')
      .addTag('Content', 'Kalender konten, konten rutin, publikasi, agent konten, laporan performa')
      .addTag('Social accounts', 'Akun YouTube, Instagram, Facebook, TikTok, LinkedIn, X')
      .addTag('Approvals', 'Persetujuan tindakan agent')
      .addTag('Notifications', 'Notifikasi')
      .addTag('Audit', 'Log audit')
      .addTag('Workspace', 'Nama & logo perusahaan, pengaturan umum')
      .addTag('Health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      useGlobalPrefix: true,
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: -1,
      },
    });
  }

  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}/`);
  console.log(`🌍 Environment: ${configService.get<string>('app.env')}\n`);
  if (swaggerEnabled) {
    console.log(`📚 Swagger Documentaion on : http://localhost:${port}/api/${swaggerPath}`);
  }
  console.log(`📊 Health check: http://localhost:${port}/${apiPrefix}/v1/health`);
  console.log(`🏓 Ping endpoint: http://localhost:${port}/ping\n`);
}

bootstrap();
