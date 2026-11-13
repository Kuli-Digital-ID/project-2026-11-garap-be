import { Module } from '@nestjs/common';
import { ProjectsModule } from '@modules/projects/projects.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { DocsService } from './docs.service';
import { DocsController } from './controllers/v1/docs.controller';

@Module({
  imports: [ProjectsModule, OrganizationModule],
  controllers: [DocsController],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocsModule {}
