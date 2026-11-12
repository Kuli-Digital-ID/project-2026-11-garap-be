import { ApiResponseDto } from '@common/dto/api-response.dto';
import { map } from 'rxjs/operators';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs';
import {
  Injectable,
  StreamableFile,
  HttpStatus,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const explicitCode: number | undefined = Reflect.getMetadata(HTTP_CODE_METADATA, context.getHandler());

    return next.handle().pipe(
      map((data) => {
        // File (unduhan lampiran) dikirim apa adanya, tanpa amplop JSON
        if (data instanceof StreamableFile) {
          return data as any;
        }

        // If data is already in ApiResponseDto format, return as is
        if (data && typeof data === 'object' && 'statusCode' in data && 'message' in data) {
          return data;
        }

        // Default success message based on HTTP method
        let message = 'Operation successful';

        switch (request.method) {
          case 'POST':
            // POST dengan @HttpCode(200) (login, aksi) bukan pembuatan data.
            if (explicitCode && explicitCode !== HttpStatus.CREATED) {
              message = 'Operation successful';
            } else {
              message = 'Resource created successfully';
              response.status(HttpStatus.CREATED);
            }
            break;
          case 'PUT':
          case 'PATCH':
            message = 'Resource updated successfully';
            break;
          case 'DELETE':
            message = 'Resource deleted successfully';
            break;
          case 'GET':
            message = 'Data retrieved successfully';
            break;
        }

        return {
          statusCode: explicitCode ?? response.statusCode ?? HttpStatus.OK,
          message,
          data,
        };
      }),
    );
  }
}
