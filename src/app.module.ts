import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { validationSchema } from './config/env.validation';
import databaseConfig from './config/database.config';
import swaggerConfig from './config/swagger.config';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import authConfig from './config/auth.config';
import storageConfig from './config/storage.config';
import { Module } from '@nestjs/common';

// Common modules
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './common/prisma/prisma.module';

// Feature modules
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AiModule } from './modules/ai/ai.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { RequestsModule } from './modules/requests/requests.module';
import { DocsModule } from './modules/docs/docs.module';
import { ContentModule } from './modules/content/content.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [appConfig, databaseConfig, jwtConfig, authConfig, storageConfig, swaggerConfig],
    }),

    // Common modules
    PrismaModule,

    // Feature modules
    ActivityModule,
    AuthModule,
    AiModule,
    OrganizationModule,
    ProjectsModule,
    TicketsModule,
    RequestsModule,
    DocsModule,
    ContentModule,
    WorkspaceModule,
    HealthModule,
  ],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },

    // Global filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
