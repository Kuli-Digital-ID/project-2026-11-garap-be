import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // SIGTERM dari podman/docker → pekerja konten berhenti & koneksi database ditutup rapi.
  app.enableShutdownHooks();
  // Cukup untuk logo perusahaan (data URL, maks. 512 KB).
  app.useBodyParser('json', { limit: '1mb' });

  const configService = app.get(ConfigService);

  // Di belakang reverse proxy (nginx, Cloudflare): IP asli & HTTPS terbaca dari header X-Forwarded-*.
  const trustProxy = configService.get<string>('app.trustProxy') ?? 'false';
  app.set('trust proxy', trustProxy === 'true' ? true : trustProxy === 'false' ? false : /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

  // Header keamanan. Gambar/PDF lampiran boleh ditampilkan FE di domain lain (tetap butuh cookie login).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Swagger UI memakai skrip & gaya inline; API sendiri hanya mengembalikan JSON/file.
      contentSecurityPolicy: false,
    }),
  );

  // Get configurations
  const swaggerEnabled = configService.get<boolean>('swagger.enabled');
  const corsOrigin = configService.get<string>('app.corsOrigin');
  const swaggerPath = configService.get<string>('swagger.path');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const port = configService.get<number>('app.port');

  // Enable CORS
  // CORS_ORIGIN boleh berisi beberapa alamat FE dipisah koma. "*" = pantulkan origin apa pun (hanya untuk pengembangan).
  const origins = (corsOrigin ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  app.enableCors({
    origin: origins.includes('*') || origins.length === 0 ? true : origins,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
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
          'Masuk lewat POST /api/v1/auth/login (email + password): sesi langsung tersimpan di cookie httpOnly "Authentication" ' +
          'dan dipakai otomatis oleh semua endpoint di halaman ini. Hak akses mengikuti posisi (Owner, Admin, Anggota, Tamu) dan izinnya.',
      )
      .setVersion('1.0')
      .addCookieAuth('Authentication')
      .addTag('Authentication', 'Masuk, keluar, ganti password, akun saya')
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
        // Kirim cookie sesi dari POST /auth/login di setiap request "Try it out".
        withCredentials: true,
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
