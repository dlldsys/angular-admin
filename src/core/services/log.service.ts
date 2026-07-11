import { Injectable } from '@angular/core';

export interface LogEntry {
  id: number;
  user: string;
  action: string;
  module: string;
  ip: string;
  time: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  private logs: LogEntry[] = [];

  log(action: string, module: string, detail: string): void {
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const entry: LogEntry = {
      id: Date.now(),
      user: user.name || '未知',
      action,
      module,
      ip: '127.0.0.1',
      time: new Date().toLocaleString('zh-CN'),
      detail
    };
    this.logs.unshift(entry);
    if (this.logs.length > 500) this.logs = this.logs.slice(0, 500);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }
}
