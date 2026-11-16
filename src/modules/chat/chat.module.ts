import { Module } from '@nestjs/common';
import { FilesModule } from '@modules/files/files.module';
import { ChatService } from './chat.service';
import { ChatController } from './controllers/v1/chat.controller';

@Module({ imports: [FilesModule], controllers: [ChatController], providers: [ChatService], exports: [ChatService] })
export class ChatModule {}
