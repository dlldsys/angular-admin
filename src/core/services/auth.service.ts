import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, of, delay, tap } from 'rxjs';

export interface UserInfo {
  username: string;
  role: 'admin' | 'employee';
  name: string;
  avatar: string;
  email: string;
}

export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  roles?: string[];
  children?: MenuItem[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<UserInfo | null>(this.getStoredUser());
  user$ = this.userSubject.asObservable();
  currentUser = signal<UserInfo | null>(this.getStoredUser());

  /** 全部菜单定义 */
  allMenus: MenuItem[] = [
    { label: '数据大盘', path: '/dashboard', icon: 'dashboard' },
    {
      label: '通用表单', path: '/form', icon: 'form', children: [
        { label: '基础表单', path: '/form/basic', icon: 'form' },
        { label: '分步表单', path: '/form/step', icon: 'form' },
        { label: '动态表单', path: '/form/dynamic', icon: 'form' }
      ]
    },
    { label: '数据列表', path: '/list', icon: 'table' },
    { label: '文件中心', path: '/file', icon: 'file' },
    { label: '系统设置', path: '/settings', icon: 'setting' },
    { label: '操作日志', path: '/logs', icon: 'profile', roles: ['admin'] }
  ];

  /** 根据角色过滤菜单 */
  getMenus(): MenuItem[] {
    const user = this.currentUser();
    if (!user) return [];
    return this.allMenus.filter(m => !m.roles || m.roles.includes(user.role)).map(m => ({
      ...m,
      children: m.children?.filter(c => !c.roles || c.roles.includes(user.role))
    }));
  }

  /** 模拟登录 */
  login(username: string, password: string): Observable<{ token: string; user: UserInfo }> {
    let user: UserInfo;
    if (username === 'admin') {
      user = { username: 'admin', role: 'admin', name: '超级管理员', avatar: '', email: 'admin@example.com' };
    } else {
      user = { username: 'employee', role: 'employee', name: '普通员工', avatar: '', email: 'employee@example.com' };
    }
    const token = 'mock-token-' + Date.now();
    return of({ token, user }).pipe(
      delay(800),
      tap(res => {
        localStorage.setItem('admin_token', res.token);
        localStorage.setItem('admin_user', JSON.stringify(res.user));
        this.userSubject.next(res.user);
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    this.userSubject.next(null);
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  hasPermission(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  private getStoredUser(): UserInfo | null {
    try {
      const raw = localStorage.getItem('admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
