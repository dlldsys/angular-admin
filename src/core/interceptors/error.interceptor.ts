import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, tap, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const message = inject(NzMessageService);
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && (event.body as any)?.code === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        message.error('登录已过期，请重新登录');
        setTimeout(() => window.location.href = './login', 1500);
      }
    }),
    catchError(err => {
      if (err.status === 0) {
        message.error('网络异常，请检查网络连接');
      } else if (err.status >= 500) {
        message.error('服务器内部错误');
      } else if (err.status === 404) {
        message.error('请求资源不存在');
      }
      return throwError(() => err);
    })
  );
};
