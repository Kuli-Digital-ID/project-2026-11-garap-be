import { Module } from '@nestjs/common';
import { ProjectsModule } from '@modules/projects/projects.module';
import { FilesModule } from '@modules/files/files.module';
import { TicketsService } from './tickets.service';
import { TicketsController } from './controllers/v1/tickets.controller';

@Module({
  imports: [ProjectsModule, FilesModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
