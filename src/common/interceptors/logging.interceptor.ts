import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

/** Kunci yang nilainya tidak boleh masuk log (password, API key, token, data pribadi terenkripsi). */
const SECRET_KEY = /pass(word)?|secret|token|api[-_]?key|authorization|cookie|nik|npwp|bpjs|bank_?account|account_?no/i;
const MAX_BODY_LOG = 500;

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[disembunyikan]' : redact(v, depth + 1)]),
  );
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  /** Di produksi body tidak dicatat sama sekali; cukup metode, path, user, dan waktu. */
  private readonly logBody = process.env.NODE_ENV !== 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();
    const userId = user?.userId || 'anonymous';

    let bodyText = '';
    if (this.logBody && body && typeof body === 'object' && Object.keys(body).length > 0) {
      const json = JSON.stringify(redact(body));
      bodyText = ` - Body: ${json.length > MAX_BODY_LOG ? `${json.slice(0, MAX_BODY_LOG)}…` : json}`;
    }
    this.logger.log(`→ [${method}] ${url} - User: ${userId}${bodyText}`);

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`← [${method}] ${url} - ${Date.now() - now}ms - User: ${userId}`),
        error: (error) => this.logger.warn(`← [${method}] ${url} - ${Date.now() - now}ms - User: ${userId} - ${error.status ?? 500} ${error.message}`),
      }),
    );
  }
}
