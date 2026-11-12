import { Module } from '@nestjs/common';
import { TicketsModule } from '@modules/tickets/tickets.module';
import { FilesModule } from '@modules/files/files.module';
import { RequestsService } from './requests.service';
import { RequestsController } from './controllers/v1/requests.controller';

@Module({
  imports: [TicketsModule, FilesModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
