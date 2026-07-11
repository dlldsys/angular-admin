import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { LogService } from '../../core/services/log.service';

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

/** 确认密码一致性校验 */
function confirmPwdValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value || !control.parent) return null;
  const newPwd = control.parent.get('newPassword')?.value;
  return control.value === newPwd ? null : { mismatch: true };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NzTabsModule, NzFormModule, NzInputModule, NzButtonModule, NzUploadModule,
    NzIconModule, NzRadioModule, NzSwitchModule, NzCardModule, NzToolTipModule, NzDividerModule
  ],
  template: `
    <div class="settings-page">
      <nz-card>
        <nz-tabset [(nzSelectedIndex)]="activeTabIndex">
          <!-- Tab1 个人信息修改 -->
          <nz-tab nzTitle="个人信息">
            <form nz-form [formGroup]="profileForm" nzLayout="horizontal" class="tab-form">
              <nz-form-item>
                <nz-form-label [nzSpan]="5">头像</nz-form-label>
                <nz-form-control [nzSpan]="12">
                  <div class="avatar-wrap">
                    <nz-upload
                      nzListType="picture-card"
                      [nzBeforeUpload]="beforeUpload"
                      [nzShowUploadList]="false"
                      nzAccept="image/png,image/jpeg">
                      @if (avatarUrl()) {
                        <img [src]="avatarUrl()" class="avatar-img" alt="头像" />
                      } @else {
                        <div class="upload-placeholder">
                          <span nz-icon nzType="plus"></span>
                          <div class="upload-text">上传</div>
                        </div>
                      }
                    </nz-upload>
                    <div class="avatar-tip">
                      <div>支持 JPG / PNG 格式</div>
                      <div>文件不超过 2MB</div>
                    </div>
                  </div>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>姓名</nz-form-label>
                <nz-form-control [nzSpan]="12" nzErrorTip="请输入姓名">
                  <input nz-input formControlName="name" placeholder="请输入姓名" />
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>邮箱</nz-form-label>
                <nz-form-control [nzSpan]="12" [nzErrorTip]="emailErr">
                  <input nz-input formControlName="email" placeholder="请输入邮箱" />
                </nz-form-control>
                <ng-template #emailErr let-control>
                  @if (control?.errors?.['required']) {
                    <span>请输入邮箱</span>
                  } @else if (control?.errors?.['email']) {
                    <span>邮箱格式不正确</span>
                  }
                </ng-template>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>手机号</nz-form-label>
                <nz-form-control [nzSpan]="12" [nzErrorTip]="phoneErr">
                  <input nz-input formControlName="phone" placeholder="请输入手机号" maxlength="11" />
                </nz-form-control>
                <ng-template #phoneErr let-control>
                  @if (control?.errors?.['required']) {
                    <span>请输入手机号</span>
                  } @else if (control?.errors?.['phone']) {
                    <span>手机号格式不正确</span>
                  }
                </ng-template>
              </nz-form-item>

              <nz-form-item>
                <nz-form-control [nzOffset]="5" [nzSpan]="12">
                  <button nz-button nzType="primary" type="button" [nzLoading]="profileSaving()" (click)="saveProfile()">
                    <span nz-icon nzType="save"></span> 保存
                  </button>
                </nz-form-control>
              </nz-form-item>
            </form>
          </nz-tab>

          <!-- Tab2 密码修改 -->
          <nz-tab nzTitle="密码修改">
            <form nz-form [formGroup]="pwdForm" nzLayout="horizontal" class="tab-form">
              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>旧密码</nz-form-label>
                <nz-form-control [nzSpan]="12" nzErrorTip="请输入旧密码">
                  <input nz-input type="password" formControlName="oldPassword" placeholder="请输入旧密码" autocomplete="off" />
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>新密码</nz-form-label>
                <nz-form-control [nzSpan]="12" [nzErrorTip]="newPwdErr">
                  <input nz-input type="password" formControlName="newPassword" placeholder="至少 8 位，建议字母+数字+符号" autocomplete="new-password" />
                </nz-form-control>
                <ng-template #newPwdErr let-control>
                  @if (control?.errors?.['required']) {
                    <span>请输入新密码</span>
                  } @else if (control?.errors?.['minlength']) {
                    <span>密码至少 8 位</span>
                  }
                </ng-template>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5">密码强度</nz-form-label>
                <nz-form-control [nzSpan]="12">
                  <div class="strength">
                    <div class="strength-bar">
                      <span class="seg" [class.active]="strength() >= 1" [style.background-color]="strength() >= 1 ? strengthColor() : ''"></span>
                      <span class="seg" [class.active]="strength() >= 2" [style.background-color]="strength() >= 2 ? strengthColor() : ''"></span>
                      <span class="seg" [class.active]="strength() >= 3" [style.background-color]="strength() >= 3 ? strengthColor() : ''"></span>
                    </div>
                    <span class="strength-text" [style.color]="strengthColor()">{{ strengthText() }}</span>
                  </div>
                  <div class="strength-hint">由大小写字母、数字、符号组成且长度 ≥ 8 为强</div>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label [nzSpan]="5" nzRequired>确认密码</nz-form-label>
                <nz-form-control [nzSpan]="12" [nzErrorTip]="confirmErr">
                  <input nz-input type="password" formControlName="confirmPassword" placeholder="请再次输入新密码" autocomplete="new-password" />
                </nz-form-control>
                <ng-template #confirmErr let-control>
                  @if (control?.errors?.['required']) {
                    <span>请确认新密码</span>
                  } @else if (control?.errors?.['mismatch']) {
                    <span>两次输入的密码不一致</span>
                  }
                </ng-template>
              </nz-form-item>

              <nz-form-item>
                <nz-form-control [nzOffset]="5" [nzSpan]="12">
                  <button nz-button nzType="primary" type="button" [nzLoading]="pwdSaving()" (click)="changePassword()">
                    <span nz-icon nzType="lock"></span> 修改密码
                  </button>
                </nz-form-control>
              </nz-form-item>
            </form>
          </nz-tab>

          <!-- Tab3 系统主题配置 -->
          <nz-tab nzTitle="系统主题">
            <div class="theme-form">
              <div class="setting-row">
                <div class="setting-label">
                  主题模式
                  <div class="setting-desc">切换亮色 / 暗色外观</div>
                </div>
                <div class="setting-control">
                  <nz-radio-group [ngModel]="theme()" (ngModelChange)="setThemeMode($event)">
                    <label nz-radio-button nzValue="light"><span nz-icon nzType="sun"></span> 亮色</label>
                    <label nz-radio-button nzValue="dark"><span nz-icon nzType="moon"></span> 暗色</label>
                  </nz-radio-group>
                </div>
              </div>

              <nz-divider></nz-divider>

              <div class="setting-row">
                <div class="setting-label">
                  主题色
                  <div class="setting-desc">选择系统主题色，刷新后保持</div>
                </div>
                <div class="setting-control color-list">
                  @for (c of presetColors; track c) {
                    <span
                      class="color-dot"
                      [class.active]="selectedColor() === c"
                      [style.background-color]="c"
                      (click)="selectColor(c)"
                      nz-tooltip="{{ c }}">
                      @if (selectedColor() === c) {
                        <span nz-icon nzType="check" class="check"></span>
                      }
                    </span>
                  }
                </div>
              </div>

              <nz-divider></nz-divider>

              <div class="setting-row">
                <div class="setting-label">
                  页面水印
                  <div class="setting-desc">在内容区显示当前用户名水印</div>
                </div>
                <div class="setting-control">
                  <nz-switch [ngModel]="watermarkOn()" (ngModelChange)="toggleWatermark($event)"></nz-switch>
                </div>
              </div>

              <nz-divider></nz-divider>

              <div class="setting-row">
                <div class="setting-label">
                  菜单默认折叠
                  <div class="setting-desc">刷新后侧边栏菜单默认折叠状态</div>
                </div>
                <div class="setting-control">
                  <nz-switch [ngModel]="menuCollapsed()" (ngModelChange)="toggleMenuCollapsed($event)"></nz-switch>
                </div>
              </div>
            </div>
          </nz-tab>
        </nz-tabset>
      </nz-card>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 880px; margin: 0 auto; }
    .tab-form { max-width: 640px; margin-top: 20px; }

    .avatar-wrap { display: flex; align-items: center; gap: 16px; }
    .upload-placeholder { color: #999; text-align: center; line-height: 1.4; }
    .upload-text { font-size: 12px; margin-top: 4px; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block; }
    .avatar-tip { color: #999; font-size: 12px; line-height: 1.8; }

    .strength { display: flex; align-items: center; gap: 12px; }
    .strength-bar { display: flex; gap: 6px; }
    .strength-bar .seg { width: 60px; height: 6px; border-radius: 3px; background: #f0f0f0; transition: background-color .3s; }
    .strength-text { font-size: 13px; font-weight: 600; min-width: 28px; }
    .strength-hint { margin-top: 6px; color: #999; font-size: 12px; }

    .theme-form { max-width: 640px; margin-top: 20px; }
    .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
    .setting-label { font-size: 14px; }
    .setting-desc { font-size: 12px; color: #999; margin-top: 4px; }
    .setting-control { display: flex; align-items: center; }

    .color-list { display: flex; gap: 14px; flex-wrap: wrap; }
    .color-dot {
      width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      color: #fff; border: 2px solid transparent; transition: transform .2s, box-shadow .2s;
    }
    .color-dot:hover { transform: scale(1.1); }
    .color-dot.active { transform: scale(1.15); box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(0, 0, 0, 0.2); }
    .check { color: #fff; font-size: 14px; }
  `]
})
export class SettingsComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private themeSvc = inject(ThemeService);
  private logSvc = inject(LogService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  theme = this.themeSvc.theme;
  user = this.auth.currentUser;

  activeTabIndex = 0;

  avatarUrl = signal('');
  profileSaving = signal(false);
  pwdSaving = signal(false);

  /** 密码强度 0=无 1=弱 2=中 3=强 */
  strength = signal(0);
  strengthText = computed(() => {
    switch (this.strength()) {
      case 1: return '弱';
      case 2: return '中';
      case 3: return '强';
      default: return '';
    }
  });
  strengthColor = computed(() => {
    switch (this.strength()) {
      case 1: return '#f5222d';
      case 2: return '#faad14';
      case 3: return '#52c41a';
      default: return '#d9d9d9';
    }
  });

  presetColors = ['#1890ff', '#52c41a', '#722ed1', '#eb2f96', '#fa8c16', '#13c2c2', '#f5222d', '#faad14'];
  selectedColor = signal(localStorage.getItem('admin_primary_color') || '#1890ff');
  watermarkOn = signal(localStorage.getItem('admin_watermark') !== 'off');
  menuCollapsed = signal(localStorage.getItem('admin_menu_collapsed') === 'on');

  profileForm!: FormGroup;
  pwdForm!: FormGroup;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    const u = this.user();
    this.avatarUrl.set(u?.avatar || '');

    this.profileForm = this.fb.group({
      name: [u?.name || '', [Validators.required]],
      email: [u?.email || '', [Validators.required, emailValidator]],
      phone: [localStorage.getItem('admin_user_phone') || '', [Validators.required, phoneValidator]]
    });

    this.pwdForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, confirmPwdValidator]]
    });

    // 监听新密码变化：更新强度 + 重新校验确认密码
    this.pwdForm.get('newPassword')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        this.strength.set(this.calcStrength(value));
        this.pwdForm.get('confirmPassword')!.updateValueAndValidity({ emitEvent: false });
      });

    this.applyPrimaryColor(this.selectedColor());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** 头像上传前预览 */
  beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = file.originFileObj as File;
    if (!rawFile) return false;
    const isImg = /image\/(png|jpe?g)/.test(rawFile.type);
    if (!isImg) {
      this.message.error('只能上传 JPG / PNG 格式的图片');
      return false;
    }
    if (rawFile.size > 2 * 1024 * 1024) {
      this.message.error('图片大小不能超过 2MB');
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => this.avatarUrl.set(e.target?.result as string);
    reader.readAsDataURL(rawFile);
    return false;
  };

  /** 计算密码强度 */
  calcStrength(pwd: string): number {
    if (!pwd) return 0;
    let types = 0;
    if (/[a-z]/.test(pwd)) types++;
    if (/[A-Z]/.test(pwd)) types++;
    if (/\d/.test(pwd)) types++;
    if (/[^a-zA-Z0-9]/.test(pwd)) types++;
    if (pwd.length < 8) return 1;
    if (types >= 3) return 3;
    if (types >= 2) return 2;
    return 1;
  }

  /** 保存个人信息 */
  saveProfile(): void {
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善表单信息');
      return;
    }
    this.profileSaving.set(true);
    setTimeout(() => {
      this.profileSaving.set(false);
      const v = this.profileForm.getRawValue();
      const u = this.user();
      if (u) {
        const updated = { ...u, name: v.name, email: v.email, avatar: this.avatarUrl() };
        localStorage.setItem('admin_user', JSON.stringify(updated));
        this.auth.currentUser.set(updated);
      }
      localStorage.setItem('admin_user_phone', v.phone);
      this.logSvc.log('编辑', '系统设置', '修改个人信息');
      this.message.success('个人信息保存成功');
    }, 600);
  }

  /** 修改密码 */
  changePassword(): void {
    if (this.pwdForm.invalid) {
      Object.values(this.pwdForm.controls).forEach(c => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('请完善密码信息');
      return;
    }
    this.pwdSaving.set(true);
    setTimeout(() => {
      this.pwdSaving.set(false);
      this.logSvc.log('编辑', '系统设置', '修改登录密码');
      this.modal.success({
        nzTitle: '密码修改成功',
        nzContent: '为了账号安全，请使用新密码重新登录。',
        nzOkText: '重新登录',
        nzOnOk: () => {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
      });
    }, 600);
  }

  /** 切换主题模式 */
  setThemeMode(mode: 'light' | 'dark'): void {
    this.themeSvc.setTheme(mode);
    this.logSvc.log('编辑', '系统设置', `切换主题为${mode === 'dark' ? '暗色' : '亮色'}`);
  }

  /** 选择主题色 */
  selectColor(color: string): void {
    this.selectedColor.set(color);
    this.applyPrimaryColor(color);
    this.logSvc.log('编辑', '系统设置', `切换主题色为${color}`);
  }

  private applyPrimaryColor(color: string): void {
    this.document.documentElement.style.setProperty('--primary-color', color);
    localStorage.setItem('admin_primary_color', color);
  }

  /** 水印开关 */
  toggleWatermark(on: boolean): void {
    this.watermarkOn.set(on);
    localStorage.setItem('admin_watermark', on ? 'on' : 'off');
    this.logSvc.log('编辑', '系统设置', `${on ? '开启' : '关闭'}页面水印`);
    this.message.info(`已${on ? '开启' : '关闭'}页面水印，刷新后生效`);
  }

  /** 菜单默认折叠开关 */
  toggleMenuCollapsed(on: boolean): void {
    this.menuCollapsed.set(on);
    localStorage.setItem('admin_menu_collapsed', on ? 'on' : 'off');
    this.logSvc.log('编辑', '系统设置', `设置菜单默认${on ? '折叠' : '展开'}`);
    this.message.success(`已设置菜单默认${on ? '折叠' : '展开'}，刷新后生效`);
  }
}
