import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} ${resStatus(ctx)} - ${ms}ms`);
      }),
    );
  }
}

function resStatus(ctx: ExecutionContext) {
  try {
    return ctx.switchToHttp().getResponse().statusCode;
  } catch {
    return 200;
  }
}
