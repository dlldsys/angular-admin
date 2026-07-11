import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { LogService } from '../../core/services/log.service';

const DRAFT_KEY = 'form_draft_basic';

/** 邮箱校验 */
function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return reg.test(control.value) ? null : { email: true };
}

/** 手机号校验 */
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(control.value) ? null : { phone: true };
}

@Component({
  selector: 'app-basic-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzButtonModule, NzSelectModule,
    NzRadioModule, NzCheckboxModule, NzDatePickerModule, NzSwitchModule,
    NzTagModule, NzCardModule, NzIconModule, NzDividerModule
  ],
  template: `
    <div class="page-container">
      <nz-card nzTitle="基础表单" class="form-card">
        <div class="form-desc">
          <span nz-icon nzType="info-circle" nzTheme="outline"></span>
          表单数据会自动保存草稿到本地，下次进入页面可恢复填写内容。
        </div>

        <form nz-form [formGroup]="form" nzLayout="horizontal" (ngSubmit)="submit()">
          <!-- 姓名 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>姓名</nz-form-label>
            <nz-form-control [nzSpan]="14" nzErrorTip="请输入姓名">
              <input nz-input formControlName="name" placeholder="请输入姓名" />
            </nz-form-control>
          </nz-form-item>

          <!-- 邮箱 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>邮箱</nz-form-label>
            <nz-form-control [nzSpan]="14" [nzErrorTip]="emailErrorTpl">
              <input nz-input formControlName="email" placeholder="请输入邮箱" />
            </nz-form-control>
            <ng-template #emailErrorTpl let-control>
              @if (control?.errors?.['required']) {
                <span>请输入邮箱</span>
              } @else if (control?.errors?.['email']) {
                <span>邮箱格式不正确</span>
              }
            </ng-template>
          </nz-form-item>

          <!-- 手机号 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6" nzRequired>手机号</nz-form-label>
            <nz-form-control [nzSpan]="14" [nzErrorTip]="phoneErrorTpl">
              <input nz-input formControlName="phone" placeholder="请输入手机号" maxlength="11" />
            </nz-form-control>
            <ng-template #phoneErrorTpl let-control>
              @if (control?.errors?.['required']) {
                <span>请输入手机号</span>
              } @else if (control?.errors?.['phone']) {
                <span>手机号格式不正确</span>
              }
            </ng-template>
          </nz-form-item>

          <!-- 性别 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">性别</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-radio-group formControlName="gender">
                <label nz-radio-button nzValue="male">男</label>
                <label nz-radio-button nzValue="female">女</label>
                <label nz-radio-button nzValue="other">其他</label>
              </nz-radio-group>
            </nz-form-control>
          </nz-form-item>

          <!-- 兴趣爱好 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">兴趣爱好</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-select
                nzMode="tags"
                formControlName="hobbies"
                [nzTokenSeparators]="[',']"
                placeholder="选择或输入兴趣爱好（回车确认）"
                [nzMaxTagCount]="5">
                @for (h of hobbyOptions; track h) {
                  <nz-option [nzValue]="h" [nzLabel]="h"></nz-option>
                }
              </nz-select>
              <div class="tag-preview">
                @for (t of form.get('hobbies')?.value || []; track t) {
                  <nz-tag [nzColor]="'blue'">{{ t }}</nz-tag>
                }
              </div>
            </nz-form-control>
          </nz-form-item>

          <!-- 部门 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">部门</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-select formControlName="department" nzPlaceHolder="请选择部门" nzAllowClear>
                @for (d of departments; track d) {
                  <nz-option [nzValue]="d" [nzLabel]="d"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <!-- 日期范围 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">日期范围</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-range-picker formControlName="dateRange" style="width:100%"></nz-range-picker>
            </nz-form-control>
          </nz-form-item>

          <!-- 开关 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">启用通知</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <nz-switch formControlName="notify"></nz-switch>
              <span class="switch-text">{{ form.get('notify')?.value ? '已开启' : '已关闭' }}</span>
            </nz-form-control>
          </nz-form-item>

          <!-- 富文本（textarea 模拟） -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">富文本内容</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <div class="rich-toolbar">
                <button type="button" nz-button nzSize="small" (click)="wrapRich('**')" nz-tooltip="加粗">
                  <span style="font-weight:bold">B</span>
                </button>
                <button type="button" nz-button nzSize="small" (click)="wrapRich('*')" nz-tooltip="斜体">
                  <span style="font-style:italic">I</span>
                </button>
                <button type="button" nz-button nzSize="small" (click)="insertRich('\n## 标题\n')" nz-tooltip="标题">H</button>
                <button type="button" nz-button nzSize="small" (click)="insertRich('\n- 列表项\n')" nz-tooltip="列表">
                  <span nz-icon nzType="unordered-list"></span>
                </button>
              </div>
              <textarea
                #richArea
                nz-input
                formControlName="richText"
                [nzAutosize]="{ minRows: 5, maxRows: 12 }"
                placeholder="支持简易 Markdown 语法：**加粗** *斜体* ##标题"></textarea>
            </nz-form-control>
          </nz-form-item>

          <!-- 备注 -->
          <nz-form-item>
            <nz-form-label [nzSpan]="6">备注</nz-form-label>
            <nz-form-control [nzSpan]="14">
              <textarea nz-input formControlName="remark" [nzAutosize]="{ minRows: 3, maxRows: 6 }" placeholder="请输入备注信息"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-divider></nz-divider>

          <nz-form-item>
            <nz-form-control [nzOffset]="6" [nzSpan]="14">
              <button nz-button nzType="primary" type="submit" [nzLoading]="submitting">提交</button>
              <button nz-button type="button" class="ml-8" (click)="saveDraft()">保存草稿</button>
              <button nz-button type="button" nzDanger class="ml-8" (click)="reset()">重置</button>
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>
    </div>
  `,
  styles: [`
    .page-container { max-width: 880px; margin: 0 auto; }
    .form-card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .form-desc {
      margin-bottom: 24px; padding: 8px 12px; background: #e6f7ff;
      border: 1px solid #91d5ff; border-radius: 4px; color: #096dd9; font-size: 13px;
      display: flex; align-items: center; gap: 6px;
    }
    .tag-preview { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .switch-text { margin-left: 10px; color: #888; }
    .rich-toolbar { margin-bottom: 6px; display: flex; gap: 4px; }
    .ml-8 { margin-left: 8px; }
  `]
})
export class BasicFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private logSvc = inject(LogService);

  form!: FormGroup;
  submitting = false;
  departments = ['技术部', '市场部', '运营部', '财务部', '人事部'];
  hobbyOptions = ['阅读', '运动', '音乐', '旅行', '摄影', '编程', '美食', '电影'];

  @ViewChild('richArea') richArea?: ElementRef<HTMLTextAreaElement>;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, emailValidator]],
      phone: ['', [Validators.required, phoneValidator]],
      gender: ['male'],
      hobbies: [[]],
      department: [null],
      dateRange: [null],
      notify: [true],
      richText: [''],
      remark: ['']
    });

    // 恢复草稿
    this.restoreDraft();

    // 表单变化自动保存草稿（防抖）
    this.form.valueChanges.pipe(
      debounceTime(800),
      takeUntil(this.destroy$)
    ).subscribe(() => this.saveDraft(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** 包裹文本 */
  wrapRich(symbol: string): void {
    const el = this.richArea?.nativeElement;
    const ctrl = this.form.get('richText');
    if (!el || !ctrl) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = ctrl.value || '';
    const selected = val.substring(start, end);
    const newVal = val.substring(0, start) + symbol + selected + symbol + val.substring(end);
    ctrl.setValue(newVal);
    el.focus();
    el.setSelectionRange(start + symbol.length, end + symbol.length);
  }

  /** 插入文本 */
  insertRich(text: string): void {
    const el = this.richArea?.nativeElement;
    const ctrl = this.form.get('richText');
    if (!el || !ctrl) return;
    const start = el.selectionStart;
    const val = ctrl.value || '';
    const newVal = val.substring(0, start) + text + val.substring(el.selectionEnd);
    ctrl.setValue(newVal);
    el.focus();
    el.setSelectionRange(start + text.length, start + text.length);
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(ctrl => {
        ctrl.markAsDirty();
        ctrl.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善表单必填项');
      return;
    }
    this.submitting = true;
    setTimeout(() => {
      this.submitting = false;
      this.logSvc.log('提交', '基础表单', '提交基础表单数据：' + this.form.get('name')?.value);
      this.message.success('表单提交成功');
      localStorage.removeItem(DRAFT_KEY);
    }, 800);
  }

  saveDraft(silent = false): void {
    const value = this.form.getRawValue();
    // 日期范围序列化
    const serializable = {
      ...value,
      dateRange: value.dateRange ? value.dateRange.map((d: Date) => d?.toISOString()) : null
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serializable));
    if (!silent) {
      this.logSvc.log('保存', '基础表单', '手动保存表单草稿');
      this.message.success('草稿已保存');
    }
  }

  restoreDraft(): void {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const dateRange = data.dateRange
        ? data.dateRange.map((s: string) => s ? new Date(s) : null)
        : null;
      this.form.patchValue({ ...data, dateRange });
      this.message.info('已恢复上次未提交的草稿');
    } catch {
      // ignore
    }
  }

  reset(): void {
    this.form.reset({
      name: '', email: '', phone: '', gender: 'male',
      hobbies: [], department: null, dateRange: null,
      notify: true, richText: '', remark: ''
    });
    localStorage.removeItem(DRAFT_KEY);
    this.logSvc.log('重置', '基础表单', '重置表单并清除草稿');
    this.message.success('已重置表单并清除草稿');
  }
}
