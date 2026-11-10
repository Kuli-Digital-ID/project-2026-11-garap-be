import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { AiModule } from '@modules/ai/ai.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { ContentService } from './content.service';
import { SocialService } from './social.service';
import { ContentRunner } from './content.runner';
import { ContentController, SocialController } from './controllers/v1/content.controller';

@Module({
  imports: [AuthModule, AiModule, ProjectsModule],
  controllers: [SocialController, ContentController],
  providers: [ContentService, SocialService, ContentRunner],
})
export class ContentModule {}
