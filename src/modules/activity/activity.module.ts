import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController, AuditController, NotificationsController, RunsController } from './controllers/v1/activity.controller';

@Global()
@Module({
  controllers: [NotificationsController, ApprovalsController, RunsController, AuditController],
  providers: [AuditService, NotificationsService, ApprovalsService],
  exports: [AuditService, NotificationsService, ApprovalsService],
})
export class ActivityModule {}
