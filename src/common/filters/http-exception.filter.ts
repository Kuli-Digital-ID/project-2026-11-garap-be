import { Prisma } from '@prisma/client';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { Response } from 'express';
import {
  Catch,
  Logger,
  HttpStatus,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors || null;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Galat database yang umum → status HTTP yang bermakna
      const map: Record<string, [number, string]> = {
        P2002: [HttpStatus.CONFLICT, 'Data dengan nilai unik yang sama sudah ada'],
        P2003: [HttpStatus.BAD_REQUEST, 'Data terkait tidak ditemukan'],
        P2025: [HttpStatus.NOT_FOUND, 'Data tidak ditemukan'],
      };
      [status, message] = map[exception.code] ?? [status, message];
      if (map[exception.code]) errors = { code: exception.code, target: exception.meta?.target ?? null };
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error for monitoring
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ApiResponseDto<null> = {
      statusCode: status,
      message,
      data: null,
      errors,
    };

    response.status(status).json(errorResponse);
  }
}
