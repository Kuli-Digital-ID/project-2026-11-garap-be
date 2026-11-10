import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { OrganizationService } from './organization.service';
import { AccessController, AgentsController, DivisionsController, MembersController } from './controllers/v1/organization.controller';

@Module({
  imports: [AiModule],
  controllers: [DivisionsController, MembersController, AgentsController, AccessController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
