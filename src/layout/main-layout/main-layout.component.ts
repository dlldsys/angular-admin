import { Component, signal, computed, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService, MenuItem } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { LogService } from '../../core/services/log.service';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';

interface BreadcrumbItem { label: string; path: string; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterOutlet,
    NzLayoutModule, NzMenuModule, NzIconModule, NzButtonModule,
    NzInputModule, NzToolTipModule, NzDropDownModule, NzDrawerModule,
    NzAvatarModule, NzBadgeModule, NzDividerModule, NzBreadCrumbModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.less']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  router = inject(Router);
  themeSvc = inject(ThemeService);
  private logSvc = inject(LogService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private route = inject(ActivatedRoute);

  isCollapsed = signal(localStorage.getItem('admin_menu_collapsed') === 'on');
  isMobile = signal(false);
  drawerVisible = signal(false);
  searchValue = signal('');
  watermarkVisible = signal(localStorage.getItem('admin_watermark') !== 'off');

  user = this.auth.currentUser;
  menus = computed(() => this.auth.getMenus());
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.checkMobile();
    window.addEventListener('resize', this.onResize);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.buildBreadcrumbs();
      this.drawerVisible.set(false);
    });
    this.buildBreadcrumbs();

    this.logSvc.log('查看', '系统', '用户登录系统');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.checkMobile();

  private checkMobile(): void {
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile) this.isCollapsed.set(true);
  }

  private buildBreadcrumbs(): void {
    const root = this.router.routerState.snapshot.root;
    const crumbs: BreadcrumbItem[] = [];
    let node: ActivatedRouteSnapshot | null = root;
    while (node) {
      if (node.data['breadcrumb']) {
        const parts = (node.data['breadcrumb'] as string).split(' / ');
        parts.forEach(p => crumbs.push({ label: p, path: node!.url.join('/') }));
      }
      node = node.firstChild;
    }
    if (crumbs.length === 0) crumbs.push({ label: '首页', path: '/dashboard' });
    this.breadcrumbs.set(crumbs);
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.drawerVisible.update(v => !v);
    } else {
      this.isCollapsed.update(v => !v);
    }
  }

  toggleTheme(): void {
    this.themeSvc.toggle();
  }

  toggleWatermark(): void {
    this.watermarkVisible.update(v => !v);
    localStorage.setItem('admin_watermark', this.watermarkVisible() ? 'on' : 'off');
  }

  onMenuClick(path: string): void {
    this.router.navigate([path]);
  }

  onSearch(): void {
    const term = this.searchValue().trim();
    if (!term) return;
    const found = this.menus().flatMap(m => [m, ...(m.children || [])]).find(m => m.label.includes(term));
    if (found) {
      this.router.navigate([found.path]);
      this.searchValue.set('');
    } else {
      this.message.warning('未找到匹配的菜单');
    }
  }

  getWatermarkData(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';
    ctx.translate(150, 100);
    ctx.rotate(-25 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.fillText(this.user()?.name || 'Admin', 0, 0);
    ctx.fillText(new Date().toLocaleDateString('zh-CN'), 0, 20);
    return canvas.toDataURL();
  }

  logout(): void {
    this.modal.confirm({
      nzTitle: '确认退出登录？',
      nzContent: '您确定要退出当前账号吗？',
      nzOkText: '确认',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.logSvc.log('退出', '系统', '用户退出登录');
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
