import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class HttpGoogleTaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    const hasGoogleTaskHeaders =
      request.headers['User-Agent'] || request.headers['user-agent'];

    if (hasGoogleTaskHeaders == 'Google-Cloud-Tasks') {
      return next.handle();
    }

    throw new HttpException('UNAUTHORIZED', 403, {
      cause: new Error('User does not have the required roles'),
    });
  }
}
