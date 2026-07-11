import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/** 已登录用户访问 /login 时重定向到首页 */
export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('admin_token');
  if (token) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
