import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@common/prisma/prisma.service';

@ApiTags('Health')
@Controller()
@SkipThrottle()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Cek kesehatan API + database (dipakai healthcheck container). 503 bila database tidak terjangkau.' })
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ message: 'Database tidak terjangkau', errors: { database: 'error' } });
    }
    return { status: 'ok', database: 'ok', timestamp: new Date().toISOString(), uptime: Math.round(process.uptime()) };
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Ping endpoint' })
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }
}
