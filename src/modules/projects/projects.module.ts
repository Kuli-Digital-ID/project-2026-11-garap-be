import { Module } from '@nestjs/common';
import { OrganizationModule } from '@modules/organization/organization.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './controllers/v1/projects.controller';

@Module({
  imports: [OrganizationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
