import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzMessageService } from 'ng-zorro-antd/message';

import { LogService } from '../../core/services/log.service';

function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return reg.test(control.value) ? null : { email: true };
}

@Component({
  selector: 'app-step-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzStepsModule, NzFormModule, NzInputModule, NzButtonModule, NzSelectModule,
    NzRadioModule, NzDatePickerModule, NzInputNumberModule, NzCardModule,
    NzIconModule, NzDividerModule, NzDescriptionsModule, NzTagModule, NzResultModule
  ],
  template: `
    <div class="page-container">
      <nz-card class="step-card">
        <!-- 步骤条 -->
        <nz-steps [nzCurrent]="current()" [nzStatus]="finishStatus()" class="steps">
          <nz-step nzTitle="基本信息" nzDescription="填写账户基本信息"></nz-step>
          <nz-step nzTitle="详细信息" nzDescription="补充详细资料"></nz-step>
          <nz-step nzTitle="完成" nzDescription="确认并提交"></nz-step>
        </nz-steps>

        <nz-divider></nz-divider>

        <!-- 结果页 -->
        @if (submitted()) {
          <nz-result nzStatus="success" nzTitle="提交成功" nzSubTitle="您的分步表单已成功提交，订单号：{{ orderId }}">
            <div nz-result-extra>
              <button nz-button nzType="primary" (click)="goHome()">再填一份</button>
              <button nz-button (click)="viewLog()">查看日志</button>
            </div>
          </nz-result>
        } @else {
          <!-- 第一步：基本信息 -->
          @if (current() === 0) {
            <form nz-form [formGroup]="basicForm" nzLayout="horizontal" class="step-form">
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>用户名</nz-form-label>
                <nz-form-control [nzSpan]="14" nzErrorTip="请输入用户名（至少3个字符）">
                  <input nz-input formControlName="username" placeholder="请输入用户名" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>邮箱</nz-form-label>
                <nz-form-control [nzSpan]="14" [nzErrorTip]="emailErr">
                  <input nz-input formControlName="email" placeholder="请输入邮箱" />
                </nz-form-control>
                <ng-template #emailErr let-control>
                  @if (control?.errors?.['required']) { <span>请输入邮箱</span> }
                  @else if (control?.errors?.['email']) { <span>邮箱格式不正确</span> }
                </ng-template>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>密码</nz-form-label>
                <nz-form-control [nzSpan]="14" nzErrorTip="密码至少6位">
                  <input nz-input type="password" formControlName="password" placeholder="请输入密码" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>角色</nz-form-label>
                <nz-form-control [nzSpan]="14">
                  <nz-radio-group formControlName="role">
                    <label nz-radio nzValue="admin">管理员</label>
                    <label nz-radio nzValue="employee">员工</label>
                  </nz-radio-group>
                </nz-form-control>
              </nz-form-item>
            </form>
          }

          <!-- 第二步：详细信息 -->
          @if (current() === 1) {
            <form nz-form [formGroup]="detailForm" nzLayout="horizontal" class="step-form">
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>真实姓名</nz-form-label>
                <nz-form-control [nzSpan]="14" nzErrorTip="请输入真实姓名">
                  <input nz-input formControlName="realName" placeholder="请输入真实姓名" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>部门</nz-form-label>
                <nz-form-control [nzSpan]="14">
                  <nz-select formControlName="department" nzPlaceHolder="请选择部门">
                    @for (d of departments; track d) {
                      <nz-option [nzValue]="d" [nzLabel]="d"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>入职日期</nz-form-label>
                <nz-form-control [nzSpan]="14" nzErrorTip="请选择入职日期">
                  <nz-date-picker formControlName="hireDate" style="width:100%"></nz-date-picker>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6" nzRequired>月薪</nz-form-label>
                <nz-form-control [nzSpan]="14" nzErrorTip="请输入有效月薪">
                  <nz-input-number formControlName="salary" [nzMin]="0" [nzStep]="500" style="width:100%"></nz-input-number>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label [nzSpan]="6">个人简介</nz-form-label>
                <nz-form-control [nzSpan]="14">
                  <textarea nz-input formControlName="bio" [nzAutosize]="{ minRows: 3, maxRows: 6 }" placeholder="请输入个人简介"></textarea>
                </nz-form-control>
              </nz-form-item>
            </form>
          }

          <!-- 第三步：确认信息 -->
          @if (current() === 2) {
            <div class="confirm-section">
              <nz-descriptions nzTitle="确认填写信息" nzBordered [nzColumn]="2">
                <nz-descriptions-item nzTitle="用户名">{{ basicForm.get('username')?.value || '-' }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="邮箱">{{ basicForm.get('email')?.value || '-' }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="密码">******</nz-descriptions-item>
                <nz-descriptions-item nzTitle="角色">
                  <nz-tag [nzColor]="basicForm.get('role')?.value === 'admin' ? 'red' : 'blue'">
                    {{ basicForm.get('role')?.value === 'admin' ? '管理员' : '员工' }}
                  </nz-tag>
                </nz-descriptions-item>
                <nz-descriptions-item nzTitle="真实姓名">{{ detailForm.get('realName')?.value || '-' }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="部门">{{ detailForm.get('department')?.value || '-' }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="入职日期">{{ formatDate(detailForm.get('hireDate')?.value) }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="月薪">¥{{ detailForm.get('salary')?.value || 0 }}</nz-descriptions-item>
                <nz-descriptions-item nzTitle="个人简介" [nzSpan]="2">
                  {{ detailForm.get('bio')?.value || '-' }}
                </nz-descriptions-item>
              </nz-descriptions>

              <div class="confirm-tip">
                <span nz-icon nzType="exclamation-circle" nzTheme="outline"></span>
                请确认以上信息无误，提交后将记录到系统中。
              </div>
            </div>
          }

          <!-- 操作按钮 -->
          <div class="step-actions">
            <button nz-button (click)="prev()" [disabled]="current() === 0 || submitting()">
              <span nz-icon nzType="left"></span>上一步
            </button>
            <div class="step-progress">第 {{ current() + 1 }} / 3 步</div>
            @if (current() < 2) {
              <button nz-button nzType="primary" (click)="next()">下一步<span nz-icon nzType="right"></span></button>
            } @else {
              <button nz-button nzType="primary" [nzLoading]="submitting()" (click)="submit()">提交</button>
            }
          </div>
        }
      </nz-card>
    </div>
  `,
  styles: [`
    .page-container { max-width: 880px; margin: 0 auto; }
    .step-card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .steps { margin-bottom: 8px; }
    .step-form { max-width: 640px; margin: 0 auto; padding-top: 8px; }
    .step-actions {
      margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 16px;
    }
    .step-progress { color: #888; font-size: 13px; }
    .confirm-section { max-width: 760px; margin: 0 auto; }
    .confirm-tip {
      margin-top: 16px; padding: 8px 12px; background: #fffbe6; border: 1px solid #ffe58f;
      border-radius: 4px; color: #ad6800; font-size: 13px; display: flex; align-items: center; gap: 6px;
    }
  `]
})
export class StepFormComponent {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private logSvc = inject(LogService);

  current = signal(0);
  submitting = signal(false);
  submitted = signal(false);
  orderId = '';
  departments = ['技术部', '市场部', '运营部', '财务部', '人事部'];

  basicForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, emailValidator]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['employee', [Validators.required]]
  });

  detailForm: FormGroup = this.fb.group({
    realName: ['', [Validators.required]],
    department: [null, [Validators.required]],
    hireDate: [null, [Validators.required]],
    salary: [8000, [Validators.required, Validators.min(0)]],
    bio: ['']
  });

  finishStatus(): 'wait' | 'process' | 'finish' | 'error' {
    return this.submitted() ? 'finish' : 'process';
  }

  next(): void {
    const form = this.current() === 0 ? this.basicForm : this.detailForm;
    if (form.invalid) {
      Object.values(form.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善当前步骤的必填项');
      return;
    }
    this.logSvc.log('下一步', '分步表单', `从第${this.current() + 1}步进入第${this.current() + 2}步`);
    this.current.update(v => Math.min(v + 1, 2));
  }

  prev(): void {
    if (this.current() === 0) return;
    this.current.update(v => Math.max(v - 1, 0));
  }

  submit(): void {
    if (this.basicForm.invalid || this.detailForm.invalid) {
      this.message.warning('表单校验未通过');
      return;
    }
    this.submitting.set(true);
    const payload = { ...this.basicForm.getRawValue(), ...this.detailForm.getRawValue() };
    this.logSvc.log('提交', '分步表单', '提交分步表单：' + payload.username);
    setTimeout(() => {
      this.submitting.set(false);
      this.orderId = 'ORD' + Date.now();
      this.submitted.set(true);
      this.message.success('提交成功');
    }, 900);
  }

  goHome(): void {
    this.current.set(0);
    this.submitted.set(false);
    this.basicForm.reset({ role: 'employee' });
    this.detailForm.reset({ salary: 8000 });
  }

  viewLog(): void {
    this.message.info('操作日志已记录，可在「操作日志」页面查看');
  }

  formatDate(d: Date | null): string {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
}
