import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../core/services/auth.service';
import { LogService } from '../../core/services/log.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private logSvc = inject(LogService);

  loading = signal(false);
  passwordVisible = signal(false);
  captcha = signal('');

  private readonly validAccounts: Record<string, string> = {
    admin: '123456',
    employee: '123456'
  };

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    captcha: ['', [Validators.required]],
    remember: [false]
  });

  ngOnInit(): void {
    this.refreshCaptcha();
    const remembered = localStorage.getItem('admin_remember');
    if (remembered) {
      this.form.patchValue({ username: remembered, remember: true });
    }
  }

  private generateCaptcha(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  refreshCaptcha(): void {
    this.captcha.set(this.generateCaptcha());
    this.form.controls.captcha.reset('');
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update(v => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => {
        c.markAsDirty();
        c.markAsTouched();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const { username, password, captcha, remember } = this.form.getRawValue();

    if (captcha.toLowerCase() !== this.captcha().toLowerCase()) {
      this.message.error('验证码错误，请重新输入');
      this.refreshCaptcha();
      return;
    }

    if (!this.validAccounts[username] || this.validAccounts[username] !== password) {
      this.message.error('用户名或密码错误');
      this.refreshCaptcha();
      return;
    }

    this.loading.set(true);
    this.auth.login(username, password).subscribe({
      next: () => {
        if (remember) {
          localStorage.setItem('admin_remember', username);
        } else {
          localStorage.removeItem('admin_remember');
        }
        this.logSvc.log('登录', '系统', `用户 ${username} 登录成功`);
        this.message.success('登录成功，正在跳转...');
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('登录失败，请稍后重试');
        this.refreshCaptcha();
      }
    });
  }
}
