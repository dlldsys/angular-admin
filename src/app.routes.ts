import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { title: '数据大盘', breadcrumb: '首页' }
      },
      {
        path: 'form/basic',
        loadComponent: () => import('./pages/form/basic-form.component').then(m => m.BasicFormComponent),
        data: { title: '基础表单', breadcrumb: '通用表单 / 基础表单' }
      },
      {
        path: 'form/step',
        loadComponent: () => import('./pages/form/step-form.component').then(m => m.StepFormComponent),
        data: { title: '分步表单', breadcrumb: '通用表单 / 分步表单' }
      },
      {
        path: 'form/dynamic',
        loadComponent: () => import('./pages/form/dynamic-form.component').then(m => m.DynamicFormComponent),
        data: { title: '动态表单', breadcrumb: '通用表单 / 动态表单' }
      },
      {
        path: 'list',
        loadComponent: () => import('./pages/data-list/data-list.component').then(m => m.DataListComponent),
        data: { title: '数据列表', breadcrumb: '数据管理 / 列表' }
      },
      {
        path: 'file',
        loadComponent: () => import('./pages/file-center/file-center.component').then(m => m.FileCenterComponent),
        data: { title: '文件中心', breadcrumb: '文件上传 / 解析中心' }
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        data: { title: '系统设置', breadcrumb: '系统 / 设置' }
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs.component').then(m => m.LogsComponent),
        data: { title: '操作日志', breadcrumb: '系统 / 操作日志' }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
