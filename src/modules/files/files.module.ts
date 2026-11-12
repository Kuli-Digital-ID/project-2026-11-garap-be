import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { StorageService } from './storage.service';
import { FilesService } from './files.service';
import { FilesController } from './controllers/v1/files.controller';

/** Modul yang memakai FileInterceptor cukup mengimpor FilesModule: folder & batas ukuran ikut dari sini. */
const Upload = MulterModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    // File sementara; StorageService memindahkannya ke folder unggahan atau ke bucket R2/S3.
    const dest = join(resolve(config.get<string>('app.uploadDir') ?? './uploads'), '.tmp');
    mkdirSync(dest, { recursive: true });
    return { dest, limits: { fileSize: (config.get<number>('app.uploadMaxMb') ?? 25) * 1024 * 1024, files: 1 } };
  },
});

@Module({
  imports: [Upload],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [FilesService, Upload],
})
export class FilesModule {}
