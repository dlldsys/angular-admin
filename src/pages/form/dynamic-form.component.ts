import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { LogService } from '../../core/services/log.service';
import { saveAs } from 'file-saver';

type FieldType = 'text' | 'number' | 'date';

interface FormItemConfig {
  label: string;
  type: FieldType;
  required: boolean;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzButtonModule, NzSelectModule,
    NzCheckboxModule, NzDatePickerModule, NzInputNumberModule, NzCardModule,
    NzIconModule, NzDividerModule, NzTagModule, NzToolTipModule, NzEmptyModule
  ],
  template: `
    <div class="page-container">
      <div class="dynamic-grid">
        <!-- 左侧：表单项设计器 -->
        <nz-card nzTitle="表单项设计器" class="designer-card">
          <div class="toolbar">
            <button nz-button nzType="dashed" (click)="addItem()">
              <span nz-icon nzType="plus"></span>添加表单项
            </button>
          </div>

          <form [formGroup]="form" class="designer-form">
            <div formArrayName="items">
              @for (item of itemsArray.controls; track item; let i = $index) {
                <div [formGroupName]="i" class="designer-item">
                  <div class="item-index">
                    <nz-tag [nzColor]="'processing'">{{ i + 1 }}</nz-tag>
                  </div>
                  <div class="item-fields">
                    <input nz-input formControlName="label" placeholder="字段标签名" class="label-input" />
                    <nz-select formControlName="type" class="type-select">
                      <nz-option nzValue="text" nzLabel="文本"></nz-option>
                      <nz-option nzValue="number" nzLabel="数字"></nz-option>
                      <nz-option nzValue="date" nzLabel="日期"></nz-option>
                    </nz-select>
                    <label nz-checkbox formControlName="required">必填</label>
                  </div>
                  <div class="item-actions">
                    <button nz-button nzSize="small" nzType="text" nz-tooltip="复制" (click)="copyItem(i)">
                      <span nz-icon nzType="copy"></span>
                    </button>
                    <button nz-button nzSize="small" nzType="text" nzDanger nz-tooltip="删除" (click)="removeItem(i)">
                      <span nz-icon nzType="delete"></span>
                    </button>
                  </div>
                </div>
              }
              @if (itemsArray.controls.length === 0) {
                <nz-empty nzDescription="暂无表单项，点击上方按钮添加" class="empty-block"></nz-empty>
              }
            </div>
          </form>

          <nz-divider></nz-divider>
          <div class="designer-footer">
            <button nz-button nzType="primary" [disabled]="itemsArray.length === 0" (click)="exportJson()">
              <span nz-icon nzType="download"></span>导出表单 JSON
            </button>
            <button nz-button (click)="loadSample()">载入示例</button>
            <button nz-button nzDanger (click)="clearAll()">清空</button>
          </div>
        </nz-card>

        <!-- 右侧：实时预览 -->
        <nz-card nzTitle="实时预览" class="preview-card">
          @if (itemsArray.controls.length === 0) {
            <nz-empty nzDescription="添加表单项后将在此预览生成的表单"></nz-empty>
          } @else {
            <form [formGroup]="previewForm" nz-form nzLayout="horizontal" class="preview-form">
              @for (ctrl of previewControls(); track ctrl.key) {
                <nz-form-item>
                  <nz-form-label [nzSpan]="7" [nzRequired]="ctrl.required">{{ ctrl.label }}</nz-form-label>
                  <nz-form-control [nzSpan]="16" [nzErrorTip]="getErrorTip(ctrl)">
                    @switch (ctrl.type) {
                      @case ('text') {
                        <input nz-input [formControlName]="ctrl.key" placeholder="请输入{{ ctrl.label }}" />
                      }
                      @case ('number') {
                        <nz-input-number [formControlName]="ctrl.key" [nzPlaceHolder]="'请输入' + ctrl.label" style="width:100%"></nz-input-number>
                      }
                      @case ('date') {
                        <nz-date-picker [formControlName]="ctrl.key" style="width:100%"></nz-date-picker>
                      }
                    }
                  </nz-form-control>
                </nz-form-item>
              }
            </form>

            <nz-divider></nz-divider>
            <div class="preview-actions">
              <button nz-button nzType="primary" (click)="submitPreview()">提交预览表单</button>
              <button nz-button (click)="resetPreview()">重置预览</button>
            </div>
          }

          <nz-divider nzText="JSON 结构" nzOrientation="left"></nz-divider>
          <pre class="json-preview">{{ jsonText() }}</pre>
        </nz-card>
      </div>
    </div>
  `,
  styles: [`
    .page-container { width: 100%; }
    .dynamic-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    }
    @media (max-width: 992px) { .dynamic-grid { grid-template-columns: 1fr; } }
    .designer-card, .preview-card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .toolbar { margin-bottom: 12px; }
    .designer-form { display: flex; flex-direction: column; gap: 8px; }
    .designer-item {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px;
    }
    .item-index { flex-shrink: 0; }
    .item-fields { flex: 1; display: flex; align-items: center; gap: 8px; }
    .label-input { flex: 1; }
    .type-select { width: 110px; flex-shrink: 0; }
    .item-actions { flex-shrink: 0; display: flex; gap: 2px; }
    .empty-block { padding: 24px 0; }
    .designer-footer { display: flex; gap: 8px; flex-wrap: wrap; }
    .preview-form { padding-top: 4px; }
    .preview-actions { display: flex; gap: 8px; }
    .json-preview {
      background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px;
      max-height: 240px; overflow: auto; white-space: pre-wrap; word-break: break-all;
      font-family: 'SFMono-Regular', Consolas, monospace; color: #333; margin: 0;
    }
  `]
})
export class DynamicFormComponent {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private logSvc = inject(LogService);

  form = this.fb.group({
    items: this.fb.array<FormGroup>([])
  });

  /** 预览表单：根据设计器动态生成 */
  previewForm = this.fb.group({});
  previewControls = signal<{ key: string; label: string; type: FieldType; required: boolean }[]>([]);

  private counter = 0;

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /** 设计器配置 → JSON */
  jsonText = computed(() => {
    // 依赖 previewControls 信号以便实时刷新
    this.previewControls();
    return JSON.stringify(this.getConfigs(), null, 2);
  });

  /** 创建一个新的设计器表单项 */
  private createItemGroup(config?: Partial<FormItemConfig>): FormGroup {
    this.counter++;
    return this.fb.group({
      key: ['field_' + this.counter],
      label: [config?.label ?? '', [Validators.required]],
      type: [config?.type ?? 'text'],
      required: [config?.required ?? false]
    });
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
    this.syncPreview();
    this.logSvc.log('新增', '动态表单', '新增一个表单项');
  }

  copyItem(index: number): void {
    const item = this.itemsArray.at(index) as FormGroup;
    const value = item.getRawValue() as FormItemConfig & { key: string };
    const copy = this.createItemGroup({ label: value.label + '_副本', type: value.type, required: value.required });
    this.itemsArray.insert(index + 1, copy);
    this.syncPreview();
    this.logSvc.log('复制', '动态表单', `复制表单项：${value.label}`);
    this.message.success('已复制表单项');
  }

  removeItem(index: number): void {
    const item = this.itemsArray.at(index) as FormGroup;
    const label = item.get('label')?.value;
    this.modal.confirm({
      nzTitle: '确认删除？',
      nzContent: `确定要删除表单项「${label}」吗？`,
      nzOnOk: () => {
        this.itemsArray.removeAt(index);
        this.syncPreview();
        this.logSvc.log('删除', '动态表单', `删除表单项：${label}`);
        this.message.success('已删除');
      }
    });
  }

  clearAll(): void {
    if (this.itemsArray.length === 0) return;
    this.modal.confirm({
      nzTitle: '确认清空？',
      nzContent: '将清空所有表单项，此操作不可恢复。',
      nzOnOk: () => {
        this.itemsArray.clear();
        this.syncPreview();
        this.logSvc.log('清空', '动态表单', '清空所有表单项');
        this.message.success('已清空');
      }
    });
  }

  loadSample(): void {
    this.itemsArray.clear();
    const samples: FormItemConfig[] = [
      { label: '姓名', type: 'text', required: true },
      { label: '年龄', type: 'number', required: true },
      { label: '出生日期', type: 'date', required: false },
      { label: '地址', type: 'text', required: false }
    ];
    samples.forEach(s => this.itemsArray.push(this.createItemGroup(s)));
    this.syncPreview();
    this.logSvc.log('载入', '动态表单', '载入示例表单');
    this.message.success('已载入示例');
  }

  /** 同步设计器到预览表单 */
  private syncPreview(): void {
    const configs = this.getConfigs();
    // 重建预览表单
    const group: Record<string, any> = {};
    configs.forEach(c => {
      const validators = c.required ? [Validators.required] : [];
      let initVal: any = '';
      if (c.type === 'number') initVal = null;
      if (c.type === 'date') initVal = null;
      group[c.key] = [initVal, validators];
    });
    this.previewForm = this.fb.group(group);
    this.previewControls.set(configs);
  }

  private getConfigs(): (FormItemConfig & { key: string })[] {
    return this.itemsArray.controls.map(c => {
      const v = (c as FormGroup).getRawValue();
      return { key: v.key, label: v.label, type: v.type as FieldType, required: v.required };
    });
  }

  getErrorTip(ctrl: { required: boolean }): string {
    return ctrl.required ? '该项为必填' : '请输入有效值';
  }

  submitPreview(): void {
    if (this.previewForm.invalid) {
      Object.values(this.previewForm.controls).forEach((c: any) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善预览表单的必填项');
      return;
    }
    this.logSvc.log('提交', '动态表单', '提交预览表单数据');
    this.message.success('预览表单提交成功：' + JSON.stringify(this.previewForm.getRawValue()));
  }

  resetPreview(): void {
    this.previewForm.reset();
    this.message.info('已重置预览表单');
  }

  exportJson(): void {
    const configs = this.getConfigs();
    const json = JSON.stringify(configs, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    saveAs(blob, 'dynamic-form-' + Date.now() + '.json');
    this.logSvc.log('导出', '动态表单', '导出表单 JSON 配置');
    this.message.success('JSON 已导出');
  }
}
