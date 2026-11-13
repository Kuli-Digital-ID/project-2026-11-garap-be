import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './controllers/v1/chat.controller';

@Module({ controllers: [ChatController], providers: [ChatService] })
export class ChatModule {}
