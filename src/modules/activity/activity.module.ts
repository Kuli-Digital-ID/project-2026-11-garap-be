import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { ApprovalsService } from './approvals.service';
import { MailService } from './mail.service';
import { DueReminderService } from './due-reminder.service';
import { ApprovalsController, AuditController, NotificationsController, RunsController } from './controllers/v1/activity.controller';

@Global()
@Module({
  controllers: [NotificationsController, ApprovalsController, RunsController, AuditController],
  providers: [AuditService, NotificationsService, ApprovalsService, MailService, DueReminderService],
  exports: [AuditService, NotificationsService, ApprovalsService, MailService],
})
export class ActivityModule {}
