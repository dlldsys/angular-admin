import { Injectable, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';

type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  theme = signal<Theme>(this.getStoredTheme());

  constructor() {
    effect(() => {
      const t = this.theme();
      const body = this.document.body;
      if (t === 'dark') {
        body.classList.add('dark');
        this.document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        body.classList.remove('dark');
        this.document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('admin_theme', t);
    });
  }

  toggle(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
  }

  private getStoredTheme(): Theme {
    return (localStorage.getItem('admin_theme') as Theme) || 'light';
  }
}
