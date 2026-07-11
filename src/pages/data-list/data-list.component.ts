import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

import { DataService, OrderRecord } from '../../core/services/data.service';
import { LogService } from '../../core/services/log.service';

interface ColumnDef {
  key: string;
  title: string;
  visible: boolean;
  editable?: boolean;
}

/** 筛选条件类型（允许 null/字符串） */
interface ListFilters {
  name: string;
  status: 'active' | 'disabled' | null;
  department: string | null;
  category: string | null;
}

/** 日期字符串转 Date 的管道（行内日期编辑用） */
@Pipe({ name: 'toDate', standalone: true })
class ToDatePipe implements PipeTransform {
  transform(value: string | Date | null): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
  }
}

@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, ToDatePipe,
    NzTableModule, NzButtonModule, NzInputModule, NzSelectModule, NzIconModule,
    NzTagModule, NzSwitchModule, NzToolTipModule, NzDropDownModule, NzCardModule,
    NzDividerModule, NzCheckboxModule, NzDatePickerModule, NzInputNumberModule, NzFormModule, NzModalModule
  ],
  template: `
    <div class="page-container" #captureContainer>
      <!-- 高级筛选 -->
      <nz-card class="filter-card" nzSize="small">
        <div class="filter-row">
          <div class="filter-item">
            <label>名称搜索</label>
            <input nz-input [(ngModel)]="filters.name" placeholder="输入订单名称" (keyup.enter)="onSearch()" style="width:180px" />
          </div>
          <div class="filter-item">
            <label>状态</label>
            <nz-select [(ngModel)]="filters.status" nzAllowClear nzPlaceHolder="全部状态" style="width:140px">
              <nz-option nzValue="active" nzLabel="启用"></nz-option>
              <nz-option nzValue="disabled" nzLabel="禁用"></nz-option>
            </nz-select>
          </div>
          <div class="filter-item">
            <label>部门</label>
            <nz-select [(ngModel)]="filters.department" nzAllowClear nzPlaceHolder="全部部门" style="width:140px">
              @for (d of departments; track d) {
                <nz-option [nzValue]="d" [nzLabel]="d"></nz-option>
              }
            </nz-select>
          </div>
          <div class="filter-item">
            <label>类别</label>
            <nz-select [(ngModel)]="filters.category" nzAllowClear nzPlaceHolder="全部类别" style="width:140px">
              @for (c of categories; track c) {
                <nz-option [nzValue]="c" [nzLabel]="c"></nz-option>
              }
            </nz-select>
          </div>
          <div class="filter-actions">
            <button nz-button nzType="primary" (click)="onSearch()">
              <span nz-icon nzType="search"></span>查询
            </button>
            <button nz-button (click)="onReset()">重置</button>
          </div>
        </div>
      </nz-card>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button nz-button nzType="primary" (click)="openAdd()">
            <span nz-icon nzType="plus"></span>新增
          </button>
          <button nz-button nzDanger (click)="batchDelete()" [disabled]="checkedIds().length === 0">
            <span nz-icon nzType="delete"></span>批量删除
            @if (checkedIds().length > 0) {
              <nz-tag nzColor="red" class="count-tag">{{ checkedIds().length }}</nz-tag>
            }
          </button>
          <button nz-button (click)="exportAll()">
            <span nz-icon nzType="download"></span>导出全部
          </button>
          <button nz-button [disabled]="checkedIds().length === 0" (click)="exportSelected()">
            <span nz-icon nzType="export"></span>导出选中
          </button>
        </div>
        <div class="toolbar-right">
          <button nz-button nz-dropdown [nzDropdownMenu]="colMenu" nz-tooltip="自定义列">
            <span nz-icon nzType="setting"></span>列设置
          </button>
          <nz-dropdown-menu #colMenu="nzDropdownMenu">
            <div class="col-panel">
              <div class="col-panel-title">显示/隐藏列</div>
              <nz-divider></nz-divider>
              <div class="col-list">
                @for (col of columns; track col.key) {
                  <label nz-checkbox [(ngModel)]="col.visible">{{ col.title }}</label>
                }
              </div>
              <nz-divider></nz-divider>
              <div class="col-panel-actions">
                <button nz-button nzSize="small" (click)="toggleAllColumns(true)">全选</button>
                <button nz-button nzSize="small" (click)="toggleAllColumns(false)">重置</button>
              </div>
            </div>
          </nz-dropdown-menu>

          <button nz-button nz-tooltip="打印" (click)="print()">
            <span nz-icon nzType="printer"></span>
          </button>
          <button nz-button nz-tooltip="截图导出" (click)="screenshot()" [nzLoading]="capturing()">
            <span nz-icon nzType="camera"></span>
          </button>
        </div>
      </div>

      <!-- 表格 -->
      <nz-card class="table-card" [nzBodyStyle]="{ padding: '0' }">
        <nz-table
          #dynamicTable
          [nzData]="dataList()"
          [nzFrontPagination]="false"
          [nzLoading]="loading()"
          [nzTotal]="total()"
          [nzPageSize]="pageSize()"
          [nzPageIndex]="pageIndex()"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzQueryParams)="onQueryParamsChange($event)">
          <thead>
            <tr>
              <th nzShowCheckbox [(nzChecked)]="allChecked" [nzIndeterminate]="indeterminate()" (nzCheckedChange)="onAllChecked($event)" nzWidth="50px"></th>
              <th nzWidth="70px">ID</th>
              @for (col of columns; track col.key) {
                @if (col.visible) {
                  <th [nzWidth]="getWidth(col.key)">{{ col.title }}</th>
                }
              }
              <th nzWidth="200px" nzRight>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (row of dataList(); track row.id) {
              <tr [class.row-selected]="checkedIds().includes(row.id)">
                <td nzShowCheckbox [nzChecked]="!!checkedSet()[row.id]" (nzCheckedChange)="onItemChecked(row.id, $event)"></td>
                <td>{{ row.id }}</td>

                <!-- 名称（可编辑） -->
                @if (getColumn('name')?.visible) {
                  <td (dblclick)="startEdit(row, 'name')">
                    @if (editingId() === row.id && editingField() === 'name') {
                      <input #editInput nz-input [ngModel]="row.name" (ngModelChange)="tempValue.set($event)"
                        (blur)="saveInlineEdit(row, 'name')" (keyup.enter)="saveInlineEdit(row, 'name')" />
                    } @else {
                      <span class="cell-text">{{ row.name }}</span>
                    }
                  </td>
                }

                <!-- 类别 -->
                @if (getColumn('category')?.visible) {
                  <td (dblclick)="startEdit(row, 'category')">
                    @if (editingId() === row.id && editingField() === 'category') {
                      <nz-select #editInput [ngModel]="row.category" (ngModelChange)="tempValue.set($event)"
                        (ngModelChange)="saveInlineEdit(row, 'category')" style="width:100%">
                        @for (c of categories; track c) {
                          <nz-option [nzValue]="c" [nzLabel]="c"></nz-option>
                        }
                      </nz-select>
                    } @else {
                      <nz-tag [nzColor]="'cyan'">{{ row.category }}</nz-tag>
                    }
                  </td>
                }

                <!-- 状态 -->
                @if (getColumn('status')?.visible) {
                  <td>
                    <nz-switch
                      [ngModel]="row.status === 'active'"
                      nzCheckedChildren="启用" nzUnCheckedChildren="禁用"
                      (ngModelChange)="onStatusToggle(row, $event)"></nz-switch>
                  </td>
                }

                <!-- 金额（可编辑） -->
                @if (getColumn('amount')?.visible) {
                  <td (dblclick)="startEdit(row, 'amount')">
                    @if (editingId() === row.id && editingField() === 'amount') {
                      <nz-input-number #editInput [ngModel]="row.amount" (ngModelChange)="tempValue.set($event)"
                        (blur)="saveInlineEdit(row, 'amount')" (keyup.enter)="saveInlineEdit(row, 'amount')" style="width:100%"></nz-input-number>
                    } @else {
                      <span class="amount-text">¥{{ row.amount | number }}</span>
                    }
                  </td>
                }

                <!-- 日期 -->
                @if (getColumn('date')?.visible) {
                  <td (dblclick)="startEdit(row, 'date')">
                    @if (editingId() === row.id && editingField() === 'date') {
                      <nz-date-picker #editInput [ngModel]="row.date | toDate" (ngModelChange)="tempValue.set($event)"
                        (ngModelChange)="saveInlineEdit(row, 'date')" style="width:100%"></nz-date-picker>
                    } @else {
                      <span class="cell-text">{{ row.date }}</span>
                    }
                  </td>
                }

                <!-- 部门（可编辑） -->
                @if (getColumn('department')?.visible) {
                  <td (dblclick)="startEdit(row, 'department')">
                    @if (editingId() === row.id && editingField() === 'department') {
                      <nz-select #editInput [ngModel]="row.department" (ngModelChange)="tempValue.set($event)"
                        (ngModelChange)="saveInlineEdit(row, 'department')" style="width:100%">
                        @for (d of departments; track d) {
                          <nz-option [nzValue]="d" [nzLabel]="d"></nz-option>
                        }
                      </nz-select>
                    } @else {
                      <span class="cell-text">{{ row.department }}</span>
                    }
                  </td>
                }

                <!-- 描述（可编辑） -->
                @if (getColumn('description')?.visible) {
                  <td (dblclick)="startEdit(row, 'description')">
                    @if (editingId() === row.id && editingField() === 'description') {
                      <input #editInput nz-input [ngModel]="row.description" (ngModelChange)="tempValue.set($event)"
                        (blur)="saveInlineEdit(row, 'description')" (keyup.enter)="saveInlineEdit(row, 'description')" />
                    } @else {
                      <span class="cell-text desc" [title]="row.description">{{ row.description }}</span>
                    }
                  </td>
                }

                <td nzRight>
                  <button nz-button nzSize="small" nzType="link" (click)="openEdit(row)">
                    <span nz-icon nzType="edit"></span>编辑
                  </button>
                  <button nz-button nzSize="small" nzType="link" nzDanger (click)="confirmDelete(row)">
                    <span nz-icon nzType="delete"></span>删除
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>

        @if (dataList().length === 0 && !loading()) {
          <div class="empty-tip">暂无数据</div>
        }
      </nz-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <nz-modal
      [nzVisible]="formVisible()"
      (nzVisibleChange)="formVisible.set($event)"
      [nzTitle]="editingRecord() ? '编辑订单' : '新增订单'"
      [nzOkText]="editingRecord() ? '保存' : '新增'"
      nzCancelText="取消"
      [nzOkLoading]="formSaving()"
      (nzOnOk)="submitForm()"
      (nzOnCancel)="formVisible.set(false)"
      [nzWidth]="640">
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="modalForm" nzLayout="horizontal">
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>订单名称</nz-form-label>
            <nz-form-control [nzSpan]="16" nzErrorTip="请输入订单名称">
              <input nz-input formControlName="name" placeholder="请输入订单名称" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>类别</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <nz-select formControlName="category" nzPlaceHolder="请选择类别">
                @for (c of categories; track c) {
                  <nz-option [nzValue]="c" [nzLabel]="c"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>部门</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <nz-select formControlName="department" nzPlaceHolder="请选择部门">
                @for (d of departments; track d) {
                  <nz-option [nzValue]="d" [nzLabel]="d"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>金额</nz-form-label>
            <nz-form-control [nzSpan]="16" nzErrorTip="请输入有效金额">
              <nz-input-number formControlName="amount" [nzMin]="0" [nzStep]="100" style="width:100%"></nz-input-number>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6">日期</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <nz-date-picker formControlName="date" style="width:100%"></nz-date-picker>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6">状态</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <nz-switch formControlName="statusRaw" nzCheckedChildren="启用" nzUnCheckedChildren="禁用"></nz-switch>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label [nzSpan]="6">描述</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <textarea nz-input formControlName="description" [nzAutosize]="{ minRows: 2, maxRows: 5 }" placeholder="请输入描述"></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>

    <!-- 导出文件名弹窗 -->
    <nz-modal
      [nzVisible]="exportVisible()"
      (nzVisibleChange)="exportVisible.set($event)"
      nzTitle="导出 Excel"
      nzOkText="导出"
      nzCancelText="取消"
      (nzOnOk)="confirmExport()"
      (nzOnCancel)="exportVisible.set(false)">
      <ng-container *nzModalContent>
        <div class="export-form">
          <p class="export-tip">将导出 {{ exportRows().length }} 条数据到 Excel 文件</p>
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>文件名</nz-form-label>
            <nz-form-control [nzSpan]="16">
              <nz-input-group nzAddOnAfter=".xlsx">
                <input type="text" nz-input [(ngModel)]="exportFileName" placeholder="请输入文件名" />
              </nz-input-group>
            </nz-form-control>
          </nz-form-item>
        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    .page-container { width: 100%; }
    .filter-card { margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .filter-row {
      display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 16px;
    }
    .filter-item {
      display: flex; flex-direction: column; gap: 4px;
      label { font-size: 12px; color: #888; }
    }
    .filter-actions { display: flex; gap: 8px; margin-left: auto; }
    .toolbar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
    }
    .toolbar-left, .toolbar-right { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .count-tag { margin-left: 4px; }
    .table-card { box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .cell-text { cursor: pointer; display: inline-block; min-width: 40px; }
    .cell-text:hover { background: #e6f7ff; border-radius: 2px; }
    .desc {
      max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .amount-text { font-weight: 600; color: #fa541c; }
    .row-selected { background: #e6f7ff !important; }
    .empty-tip { text-align: center; padding: 32px; color: #999; }
    .col-panel { padding: 12px 16px; min-width: 180px; }
    .col-panel-title { font-weight: 600; margin-bottom: 4px; }
    .col-list { display: flex; flex-direction: column; gap: 6px; }
    .col-panel-actions { display: flex; gap: 8px; }
    .export-form .export-tip { color: #888; font-size: 13px; margin-bottom: 12px; }
  `]
})
export class DataListComponent implements OnInit, OnDestroy {
  private dataSvc = inject(DataService);
  private logSvc = inject(LogService);
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  @ViewChild('captureContainer') captureContainer?: ElementRef<HTMLElement>;

  dataList = signal<OrderRecord[]>([]);
  loading = signal(false);
  total = signal(0);
  pageIndex = signal(1);
  pageSize = signal(10);
  capturing = signal(false);

  departments = this.dataSvc.getDepartments();
  categories = this.dataSvc.getCategories();

  filters: ListFilters = { name: '', status: null, department: null, category: null };

  // 列定义
  columns: ColumnDef[] = [
    { key: 'name', title: '订单名称', visible: true, editable: true },
    { key: 'category', title: '类别', visible: true, editable: true },
    { key: 'status', title: '状态', visible: true },
    { key: 'amount', title: '金额', visible: true, editable: true },
    { key: 'date', title: '日期', visible: true, editable: true },
    { key: 'department', title: '部门', visible: true, editable: true },
    { key: 'description', title: '描述', visible: true, editable: true }
  ];

  // 勾选
  checkedSet = signal<Record<number, boolean>>({});
  checkedIds = computed(() => {
    return Object.keys(this.checkedSet())
      .filter(k => this.checkedSet()[+k])
      .map(k => +k);
  });
  allChecked = false;
  indeterminate = signal(false);

  // 行内编辑
  editingId = signal<number | null>(null);
  editingField = signal<string>('');
  tempValue = signal<any>(null);

  // 弹窗表单
  formVisible = signal(false);
  formSaving = signal(false);
  editingRecord = signal<OrderRecord | null>(null);
  modalForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    category: [null, [Validators.required]],
    department: [null, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0)]],
    date: [new Date()],
    statusRaw: [true],
    description: ['']
  });

  // 导出弹窗
  exportVisible = signal(false);
  exportFileName = 'orders';
  exportRows = signal<OrderRecord[]>([]);

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getColumn(key: string): ColumnDef | undefined {
    return this.columns.find(c => c.key === key);
  }

  getWidth(key: string): string {
    const map: Record<string, string> = {
      name: '160px', category: '110px', status: '100px',
      amount: '120px', date: '120px', department: '100px', description: '220px'
    };
    return map[key] || '120px';
  }

  loadData(): void {
    this.loading.set(true);
    this.dataSvc.getOrders(this.pageIndex(), this.pageSize(), {
      name: this.filters.name || undefined,
      status: this.filters.status || undefined,
      department: this.filters.department || undefined,
      category: this.filters.category || undefined
    } as Partial<OrderRecord>).pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.dataList.set(res.list);
        this.total.set(res.total);
        this.loading.set(false);
        this.refreshCheckedStatus();
      });
  }

  onQueryParamsChange(params: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(params.pageIndex);
    this.pageSize.set(params.pageSize);
    this.loadData();
  }

  onSearch(): void {
    this.pageIndex.set(1);
    this.logSvc.log('查询', '数据列表', `筛选条件：${JSON.stringify(this.filters)}`);
    this.loadData();
  }

  onReset(): void {
    this.filters = { name: '', status: null, department: null, category: null };
    this.pageIndex.set(1);
    this.logSvc.log('重置', '数据列表', '重置筛选条件');
    this.loadData();
  }

  // ===== 勾选 =====
  onAllChecked(checked: boolean): void {
    const set: Record<number, boolean> = {};
    if (checked) {
      this.dataList().forEach(r => (set[r.id] = true));
    }
    this.checkedSet.set(set);
    this.refreshCheckedStatus();
  }

  onItemChecked(id: number, checked: boolean): void {
    const set = { ...this.checkedSet() };
    if (checked) set[id] = true;
    else delete set[id];
    this.checkedSet.set(set);
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    const list = this.dataList();
    if (list.length === 0) {
      this.allChecked = false;
      this.indeterminate.set(false);
      return;
    }
    const allCheckedNow = list.every(r => this.checkedSet()[r.id]);
    const someChecked = list.some(r => this.checkedSet()[r.id]);
    this.allChecked = allCheckedNow;
    this.indeterminate.set(someChecked && !allCheckedNow);
  }

  // ===== 行内编辑 =====
  startEdit(row: OrderRecord, field: string): void {
    this.editingId.set(row.id);
    this.editingField.set(field);
    this.tempValue.set(row[field as keyof OrderRecord]);
  }

  saveInlineEdit(row: OrderRecord, field: string): void {
    if (this.editingId() !== row.id) return;
    const newVal = this.tempValue();
    let formattedVal: any = newVal;
    if (field === 'date' && newVal instanceof Date) {
      formattedVal = `${newVal.getFullYear()}-${String(newVal.getMonth() + 1).padStart(2, '0')}-${String(newVal.getDate()).padStart(2, '0')}`;
    }
    this.editingId.set(null);
    this.editingField.set('');

    if (newVal === null || newVal === undefined) return;
    if (row[field as keyof OrderRecord] === formattedVal) return;

    const updates: Partial<OrderRecord> = { [field]: formattedVal };
    this.dataSvc.updateOrder(row.id, updates).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) {
        Object.assign(row, updates);
        this.logSvc.log('行内编辑', '数据列表', `编辑订单#${row.id}的${field}字段`);
        this.message.success('已更新');
      }
    });
  }

  // ===== 状态切换 =====
  onStatusToggle(row: OrderRecord, active: boolean): void {
    this.dataSvc.toggleStatus(row.id).pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) {
        row.status = active ? 'active' : 'disabled';
        this.logSvc.log('状态切换', '数据列表', `订单#${row.id}状态切换为${active ? '启用' : '禁用'}`);
        this.message.success(`已${active ? '启用' : '禁用'}`);
      }
    });
  }

  // ===== 新增/编辑 =====
  openAdd(): void {
    this.editingRecord.set(null);
    this.modalForm.reset({
      name: '', category: null, department: null,
      amount: 0, date: new Date(), statusRaw: true, description: ''
    });
    this.formVisible.set(true);
    this.logSvc.log('打开新增', '数据列表', '打开新增订单弹窗');
  }

  openEdit(row: OrderRecord): void {
    this.editingRecord.set(row);
    this.modalForm.patchValue({
      name: row.name,
      category: row.category,
      department: row.department,
      amount: row.amount,
      date: new Date(row.date),
      statusRaw: row.status === 'active',
      description: row.description
    });
    this.formVisible.set(true);
    this.logSvc.log('打开编辑', '数据列表', `打开编辑订单#${row.id}`);
  }

  submitForm(): void {
    if (this.modalForm.invalid) {
      Object.values(this.modalForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善必填项');
      return;
    }
    this.formSaving.set(true);
    const val = this.modalForm.getRawValue();
    const dateStr = val.date
      ? `${val.date.getFullYear()}-${String(val.date.getMonth() + 1).padStart(2, '0')}-${String(val.date.getDate()).padStart(2, '0')}`
      : new Date().toISOString().slice(0, 10);
    const payload: Partial<OrderRecord> = {
      name: val.name,
      category: val.category,
      department: val.department,
      amount: val.amount,
      date: dateStr,
      status: val.statusRaw ? 'active' : 'disabled',
      description: val.description
    };

    const editing = this.editingRecord();
    if (editing) {
      this.dataSvc.updateOrder(editing.id, payload).pipe(takeUntil(this.destroy$)).subscribe(ok => {
        this.formSaving.set(false);
        if (ok) {
          Object.assign(editing, payload);
          this.logSvc.log('编辑', '数据列表', `编辑订单#${editing.id}：${val.name}`);
          this.message.success('编辑成功');
          this.formVisible.set(false);
          this.loadData();
        }
      });
    } else {
      this.dataSvc.addOrder(payload).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.formSaving.set(false);
        this.logSvc.log('新增', '数据列表', `新增订单：${val.name}`);
        this.message.success('新增成功');
        this.formVisible.set(false);
        this.pageIndex.set(1);
        this.loadData();
      });
    }
  }

  // ===== 删除 =====
  confirmDelete(row: OrderRecord): void {
    this.modal.confirm({
      nzTitle: '确认删除？',
      nzContent: `确定要删除订单「${row.name}」吗？删除后不可恢复。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.dataSvc.deleteOrders([row.id]).pipe(takeUntil(this.destroy$)).subscribe(ok => {
          if (ok) {
            this.logSvc.log('删除', '数据列表', `删除订单#${row.id}：${row.name}`);
            this.message.success('删除成功');
            this.loadData();
          }
        });
      }
    });
  }

  batchDelete(): void {
    const ids = this.checkedIds();
    if (ids.length === 0) return;
    this.modal.confirm({
      nzTitle: '批量删除确认',
      nzContent: `确定要删除选中的 ${ids.length} 条订单吗？删除后不可恢复。`,
      nzOkText: '批量删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        this.dataSvc.deleteOrders(ids).pipe(takeUntil(this.destroy$)).subscribe(ok => {
          if (ok) {
            this.logSvc.log('批量删除', '数据列表', `批量删除${ids.length}条订单`);
            this.message.success(`已删除 ${ids.length} 条`);
            this.checkedSet.set({});
            this.loadData();
          }
        });
      }
    });
  }

  // ===== 列设置 =====
  toggleAllColumns(visible: boolean): void {
    if (visible) {
      this.columns.forEach(c => (c.visible = true));
    } else {
      // 重置为默认（仅显示主要列）
      this.columns.forEach(c => {
        c.visible = ['name', 'category', 'status', 'amount'].includes(c.key);
      });
    }
    this.logSvc.log('列设置', '数据列表', visible ? '显示所有列' : '重置列显示');
  }

  // ===== 导出 =====
  exportAll(): void {
    // 拉取全部数据导出
    this.dataSvc.getOrders(1, 9999, {
      name: this.filters.name || undefined,
      status: this.filters.status || undefined,
      department: this.filters.department || undefined,
      category: this.filters.category || undefined
    } as Partial<OrderRecord>).pipe(takeUntil(this.destroy$)).subscribe(res => {
      this.exportRows.set(res.list);
      this.exportFileName = 'orders-all-' + this.dateStamp();
      this.exportVisible.set(true);
    });
  }

  exportSelected(): void {
    const ids = this.checkedIds();
    if (ids.length === 0) {
      this.message.warning('请先勾选要导出的行');
      return;
    }
    // 从当前页及已加载数据中取，未加载的通过查询补全
    const selected = this.dataList().filter(r => ids.includes(r.id));
    // 若勾选数大于当前页可见数，拉取全部再过滤
    if (selected.length < ids.length) {
      this.dataSvc.getOrders(1, 9999, {}).pipe(takeUntil(this.destroy$)).subscribe(res => {
        const rows = res.list.filter(r => ids.includes(r.id));
        this.exportRows.set(rows);
        this.exportFileName = 'orders-selected-' + this.dateStamp();
        this.exportVisible.set(true);
      });
    } else {
      this.exportRows.set(selected);
      this.exportFileName = 'orders-selected-' + this.dateStamp();
      this.exportVisible.set(true);
    }
  }

  confirmExport(): void {
    if (!this.exportFileName.trim()) {
      this.message.warning('请输入文件名');
      return;
    }
    const rows = this.exportRows();
    const data = rows.map(r => ({
      'ID': r.id,
      '订单名称': r.name,
      '类别': r.category,
      '状态': r.status === 'active' ? '启用' : '禁用',
      '金额': r.amount,
      '日期': r.date,
      '部门': r.department,
      '描述': r.description
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单数据');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, this.exportFileName.trim() + '.xlsx');
    this.logSvc.log('导出Excel', '数据列表', `导出${rows.length}条数据到 ${this.exportFileName}.xlsx`);
    this.message.success('导出成功');
    this.exportVisible.set(false);
  }

  // ===== 打印 =====
  print(): void {
    this.logSvc.log('打印', '数据列表', '打印当前数据列表');
    window.print();
  }

  // ===== 截图 =====
  screenshot(): void {
    if (!this.captureContainer) return;
    this.capturing.set(true);
    html2canvas(this.captureContainer.nativeElement, { backgroundColor: '#ffffff', scale: 2 }).then(canvas => {
      canvas.toBlob(blob => {
        if (blob) {
          saveAs(blob, 'data-list-screenshot-' + this.dateStamp() + '.png');
          this.logSvc.log('截图导出', '数据列表', '导出页面截图');
          this.message.success('截图已导出');
        }
        this.capturing.set(false);
      });
    }).catch(() => {
      this.capturing.set(false);
      this.message.error('截图失败');
    });
  }

  private dateStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
