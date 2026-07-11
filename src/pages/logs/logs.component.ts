import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { DataService, LogItem, LogFilter } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { LogService } from '../../core/services/log.service';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzTableModule, NzButtonModule, NzSelectModule,
    NzDatePickerModule, NzIconModule, NzTagModule, NzCardModule,
    NzToolTipModule, NzModalModule, NzDescriptionsModule
  ],
  template: `
    <div class="logs-page">
      <nz-card>
        <!-- 顶部操作栏：筛选 + 操作 -->
        <div class="toolbar">
          <div class="filters">
            <nz-select
              class="filter-item"
              nzAllowClear
              nzPlaceHolder="操作类型"
              [(ngModel)]="filterAction"
              (ngModelChange)="onFilter()">
              @for (a of actionOptions; track a) {
                <nz-option [nzValue]="a" [nzLabel]="a"></nz-option>
              }
            </nz-select>

            <nz-select
              class="filter-item"
              nzAllowClear
              nzPlaceHolder="所属模块"
              [(ngModel)]="filterModule"
              (ngModelChange)="onFilter()">
              @for (m of moduleOptions; track m) {
                <nz-option [nzValue]="m" [nzLabel]="m"></nz-option>
              }
            </nz-select>

            <nz-range-picker
              class="filter-item"
              [(ngModel)]="filterDateRange"
              (ngModelChange)="onFilter()"></nz-range-picker>

            <button nz-button (click)="onReset()" nz-tooltip="重置筛选条件">
              <span nz-icon nzType="reload"></span> 重置
            </button>
          </div>

          <div class="actions">
            <span class="total-text">共 {{ total() }} 条</span>
            <button nz-button (click)="exportLogs()" nz-tooltip="导出当前筛选结果为 Excel">
              <span nz-icon nzType="download"></span> 导出 Excel
            </button>
            @if (isAdmin()) {
              <button nz-button nzDanger (click)="clearLogs()" nz-tooltip="清空全部操作日志（管理员）">
                <span nz-icon nzType="delete"></span> 清空日志
              </button>
            }
          </div>
        </div>

        <!-- 日志表格（服务端分页） -->
        <nz-table
          #logTable
          [nzData]="list()"
          [nzFrontPagination]="false"
          [nzLoading]="loading()"
          [nzTotal]="total()"
          [nzPageSize]="pageSize"
          [nzPageIndex]="pageIndex"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzQueryParams)="onQueryParamsChange($event)"
          [nzScroll]="{ x: '960px' }">
          <thead>
            <tr>
              <th nzWidth="60px">ID</th>
              <th nzWidth="110px">操作人</th>
              <th nzWidth="100px">操作类型</th>
              <th nzWidth="120px">所属模块</th>
              <th nzWidth="140px">IP 地址</th>
              <th nzWidth="170px">操作时间</th>
              <th>操作详情</th>
              <th nzWidth="90px" nzRight>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of list(); track item.id) {
              <tr class="log-row" (click)="showDetail(item)">
                <td>{{ item.id }}</td>
                <td>{{ item.user }}</td>
                <td><nz-tag [nzColor]="actionColor(item.action)">{{ item.action }}</nz-tag></td>
                <td>{{ item.module }}</td>
                <td>{{ item.ip }}</td>
                <td>{{ item.time }}</td>
                <td class="detail-cell" [title]="item.detail">{{ item.detail }}</td>
                <td nzRight>
                  <button nz-button nzType="link" nzSize="small" (click)="$event.stopPropagation(); showDetail(item)">
                    详情
                  </button>
                </td>
              </tr>
            } @empty {
              @if (!loading()) {
                <tr>
                  <td colspan="8" class="empty-cell">暂无日志数据</td>
                </tr>
              }
            }
          </tbody>
        </nz-table>
      </nz-card>
    </div>

    <!-- 日志详情弹窗 -->
    <nz-modal
      [(nzVisible)]="detailVisible"
      nzTitle="日志详情"
      [nzFooter]="null"
      nzWidth="640">
      <div *nzModalContent>
        @if (currentDetail) {
          <nz-descriptions [nzColumn]="1" nzBordered nzSize="small">
            <nz-descriptions-item nzTitle="日志 ID">{{ currentDetail.id }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="操作人">{{ currentDetail.user }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="操作类型">
              <nz-tag [nzColor]="actionColor(currentDetail.action)">{{ currentDetail.action }}</nz-tag>
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="所属模块">{{ currentDetail.module }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="IP 地址">{{ currentDetail.ip }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="操作时间">{{ currentDetail.time }}</nz-descriptions-item>
            <nz-descriptions-item nzTitle="操作详情">{{ currentDetail.detail }}</nz-descriptions-item>
          </nz-descriptions>
        }
      </div>
    </nz-modal>
  `,
  styles: [`
    .logs-page { width: 100%; }
    .toolbar {
      display: flex; flex-wrap: wrap; gap: 12px;
      justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .filter-item { width: 180px; }
    .actions { display: flex; gap: 8px; align-items: center; }
    .total-text { color: #888; font-size: 13px; margin-right: 4px; white-space: nowrap; }
    .log-row { cursor: pointer; transition: background-color .2s; }
    .log-row:hover { background-color: rgba(24, 144, 255, 0.06); }
    .detail-cell {
      max-width: 320px; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; color: #666;
    }
    .empty-cell { text-align: center; padding: 32px 0; color: #999; }
    @media (max-width: 768px) {
      .filter-item { width: 140px; }
    }
  `]
})
export class LogsComponent implements OnInit, OnDestroy {
  private dataSvc = inject(DataService);
  private auth = inject(AuthService);
  private logSvc = inject(LogService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  list = signal<LogItem[]>([]);
  total = signal(0);
  loading = signal(false);

  pageIndex = 1;
  pageSize = 10;

  actionOptions = this.dataSvc.getLogActions();
  moduleOptions = this.dataSvc.getLogModules();

  filterAction: string | null = null;
  filterModule: string | null = null;
  filterDateRange: Date[] | null = null;

  detailVisible = signal(false);
  currentDetail: LogItem | null = null;

  isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.logSvc.log('查看', '操作日志', '查看操作日志列表');
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** 构造筛选条件 */
  private buildFilters(): LogFilter {
    const f: LogFilter = {};
    if (this.filterAction) f.action = this.filterAction;
    if (this.filterModule) f.module = this.filterModule;
    if (this.filterDateRange && this.filterDateRange.length === 2 && this.filterDateRange[0] && this.filterDateRange[1]) {
      f.dateRange = [this.filterDateRange[0], this.filterDateRange[1]];
    }
    return f;
  }

  /** 加载日志数据 */
  load(): void {
    this.loading.set(true);
    this.dataSvc.getLogs(this.pageIndex, this.pageSize, this.buildFilters())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.list.set(res.list);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.error('日志加载失败');
        }
      });
  }

  /** 筛选条件变化 */
  onFilter(): void {
    this.pageIndex = 1;
    this.load();
  }

  /** 重置筛选 */
  onReset(): void {
    this.filterAction = null;
    this.filterModule = null;
    this.filterDateRange = null;
    this.pageIndex = 1;
    this.load();
  }

  /** 分页参数变化（服务端分页） */
  onQueryParamsChange(params: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.load();
  }

  /** 显示详情弹窗 */
  showDetail(item: LogItem): void {
    this.currentDetail = item;
    this.detailVisible.set(true);
  }

  /** 操作类型标签颜色：登录=蓝 新增=绿 删除=红 导入/导出=橙 */
  actionColor(action: string): string {
    switch (action) {
      case '登录': return 'blue';
      case '新增': return 'green';
      case '删除': return 'red';
      case '导入':
      case '导出': return 'orange';
      case '编辑': return 'cyan';
      case '查看': return 'default';
      default: return 'default';
    }
  }

  /** 导出日志 Excel */
  exportLogs(): void {
    this.loading.set(true);
    // 导出当前筛选条件下的全部数据
    this.dataSvc.getLogs(1, 99999, this.buildFilters())
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.loading.set(false);
        const rows = res.list.map(l => ({
          'ID': l.id,
          '操作人': l.user,
          '操作类型': l.action,
          '所属模块': l.module,
          'IP地址': l.ip,
          '操作时间': l.time,
          '操作详情': l.detail
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
          { wch: 16 }, { wch: 22 }, { wch: 40 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '操作日志');
        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`);
        this.logSvc.log('导出', '操作日志', `导出 ${res.list.length} 条操作日志`);
        this.message.success(`已导出 ${res.list.length} 条日志`);
      });
  }

  /** 清空日志（仅管理员） */
  clearLogs(): void {
    this.modal.confirm({
      nzTitle: '确认清空所有日志？',
      nzContent: '此操作将删除全部操作日志，且不可恢复，请谨慎操作。',
      nzOkText: '确认清空',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.dataSvc.clearLogs()
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.logSvc.log('删除', '操作日志', '清空全部操作日志');
            this.message.success('日志已清空');
            this.pageIndex = 1;
            this.load();
          });
      }
    });
  }
}
