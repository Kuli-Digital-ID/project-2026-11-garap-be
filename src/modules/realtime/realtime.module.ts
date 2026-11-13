import { Global, Module } from '@nestjs/common';
import { RealtimeBus } from './realtime.bus';
import { RealtimeController } from './realtime.controller';
import { RealtimeInterceptor } from './realtime.interceptor';

@Global()
@Module({ controllers: [RealtimeController], providers: [RealtimeBus, RealtimeInterceptor], exports: [RealtimeBus, RealtimeInterceptor] })
export class RealtimeModule {}
