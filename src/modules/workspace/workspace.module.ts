import { Module } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './controllers/v1/workspace.controller';

@Module({ controllers: [WorkspaceController], providers: [WorkspaceService] })
export class WorkspaceModule {}
