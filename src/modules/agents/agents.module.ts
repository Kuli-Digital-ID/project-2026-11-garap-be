import { Module } from '@nestjs/common';
import { ActivityModule } from '@modules/activity/activity.module';
import { AiModule } from '@modules/ai/ai.module';
import { ChatModule } from '@modules/chat/chat.module';
import { DocsModule } from '@modules/docs/docs.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { TicketsModule } from '@modules/tickets/tickets.module';
import { AgentRuntime } from './agent-runtime.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [ActivityModule, AiModule, ChatModule, DocsModule, ProjectsModule, TicketsModule],
  controllers: [AgentsController],
  providers: [AgentRuntime],
})
export class AgentsModule {}
