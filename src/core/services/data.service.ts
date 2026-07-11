import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface OrderRecord {
  id: number;
  name: string;
  category: string;
  status: 'active' | 'disabled';
  amount: number;
  date: string;
  department: string;
  description: string;
}

export interface LogItem {
  id: number;
  user: string;
  action: string;
  module: string;
  ip: string;
  time: string;
  detail: string;
}

export interface LogFilter {
  action?: string;
  module?: string;
  dateRange?: Date[];
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private departments = ['技术部', '市场部', '运营部', '财务部', '人事部'];
  private categories = ['软件产品', '硬件设备', '咨询服务', '培训服务', '运维服务'];

  private orders: OrderRecord[] = Array.from({ length: 68 }, (_, i) => ({
    id: i + 1,
    name: `订单-${String(i + 1).padStart(4, '0')}`,
    category: this.categories[i % this.categories.length],
    status: i % 3 === 0 ? 'disabled' : 'active',
    amount: Math.round(Math.random() * 50000 + 1000),
    date: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    department: this.departments[i % this.departments.length],
    description: `这是第${i + 1}条订单的描述信息`
  }));

  getOrders(page: number, pageSize: number, filters?: Partial<OrderRecord>): Observable<{ list: OrderRecord[]; total: number }> {
    let filtered = [...this.orders];
    if (filters?.name) filtered = filtered.filter(o => o.name.includes(filters.name!));
    if (filters?.status) filtered = filtered.filter(o => o.status === filters.status);
    if (filters?.department) filtered = filtered.filter(o => o.department === filters.department);
    if (filters?.category) filtered = filtered.filter(o => o.category === filters.category);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);
    return of({ list, total }).pipe(delay(400));
  }

  addOrder(order: Partial<OrderRecord>): Observable<OrderRecord> {
    const newOrder: OrderRecord = {
      id: this.orders.length + 1,
      name: order.name || `订单-${String(this.orders.length + 1).padStart(4, '0')}`,
      category: order.category || this.categories[0],
      status: order.status || 'active',
      amount: order.amount || 0,
      date: order.date || new Date().toISOString().slice(0, 10),
      department: order.department || this.departments[0],
      description: order.description || ''
    };
    this.orders.unshift(newOrder);
    return of(newOrder).pipe(delay(400));
  }

  updateOrder(id: number, updates: Partial<OrderRecord>): Observable<boolean> {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      this.orders[idx] = { ...this.orders[idx], ...updates };
    }
    return of(true).pipe(delay(400));
  }

  deleteOrders(ids: number[]): Observable<boolean> {
    this.orders = this.orders.filter(o => !ids.includes(o.id));
    return of(true).pipe(delay(400));
  }

  toggleStatus(id: number): Observable<boolean> {
    const idx = this.orders.findIndex(o => o.id === id);
    if (idx >= 0) {
      this.orders[idx].status = this.orders[idx].status === 'active' ? 'disabled' : 'active';
    }
    return of(true).pipe(delay(300));
  }

  getDepartments() { return this.departments; }
  getCategories() { return this.categories; }

  /** Dashboard 统计数据 */
  getDashboardStats() {
    return of({
      cards: [
        { title: '用户总数', value: 12856, icon: 'team', color: '#1890ff', trend: '+12.5%' },
        { title: '订单量', value: 3492, icon: 'shopping-cart', color: '#52c41a', trend: '+8.3%' },
        { title: '待处理任务', value: 186, icon: 'clock-circle', color: '#faad14', trend: '-3.2%' },
        { title: '本月营收', value: 892400, icon: 'dollar', color: '#722ed1', trend: '+15.7%', prefix: '¥' }
      ],
      lineChart: {
        months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        series: [
          { name: '收入', data: [320000, 410000, 380000, 520000, 490000, 610000, 580000, 670000, 720000, 690000, 780000, 892000] },
          { name: '支出', data: [180000, 220000, 210000, 280000, 260000, 310000, 290000, 340000, 360000, 350000, 390000, 420000] }
        ]
      },
      barChart: {
        departments: ['技术部', '市场部', '运营部', '财务部', '人事部'],
        data: [4200, 3800, 5100, 2600, 1800]
      },
      pieChart: [
        { name: '软件产品', value: 1450 },
        { name: '硬件设备', value: 980 },
        { name: '咨询服务', value: 720 },
        { name: '培训服务', value: 560 },
        { name: '运维服务', value: 380 }
      ],
      radarChart: {
        indicators: [
          { name: '销售', max: 100 },
          { name: '管理', max: 100 },
          { name: '技术', max: 100 },
          { name: '客服', max: 100 },
          { name: '研发', max: 100 },
          { name: '市场', max: 100 }
        ],
        data: [{ name: '本季度', value: [85, 72, 91, 68, 88, 76] }]
      }
    }).pipe(delay(600));
  }

  /** 操作日志数据源 */
  private logActions = ['登录', '新增', '编辑', '删除', '导入', '导出', '查看'];
  private logModules = ['系统', '订单管理', '用户管理', '文件中心', '系统设置'];
  private logUsers = ['超级管理员', '普通员工'];
  private logsData: LogItem[] = this.generateLogs();

  private generateLogs(): LogItem[] {
    return Array.from({ length: 128 }, (_, i) => ({
      id: i + 1,
      user: this.logUsers[i % 2],
      action: this.logActions[i % this.logActions.length],
      module: this.logModules[i % this.logModules.length],
      ip: `192.168.1.${100 + (i % 50)}`,
      time: `2026-07-${String((i % 11) + 1).padStart(2, '0')} ${String(8 + (i % 12)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      detail: `${this.logUsers[i % 2]}在${this.logModules[i % this.logModules.length]}模块执行了${this.logActions[i % this.logActions.length]}操作`
    }));
  }

  /** 操作日志（支持筛选 + 分页），返回 { list, total } */
  getLogs(page: number, pageSize: number, filters?: LogFilter): Observable<{ list: LogItem[]; total: number }> {
    let filtered = [...this.logsData];
    if (filters?.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }
    if (filters?.module) {
      filtered = filtered.filter(l => l.module === filters.module);
    }
    if (filters?.dateRange && filters.dateRange.length === 2 && filters.dateRange[0] && filters.dateRange[1]) {
      const start = new Date(filters.dateRange[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.dateRange[1]);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => {
        const t = new Date(l.time.replace(/-/g, '/'));
        return t >= start && t <= end;
      });
    }
    const total = filtered.length;
    const startIdx = (page - 1) * pageSize;
    return of({ list: filtered.slice(startIdx, startIdx + pageSize), total }).pipe(delay(400));
  }

  /** 清空全部操作日志 */
  clearLogs(): Observable<boolean> {
    this.logsData = [];
    return of(true).pipe(delay(300));
  }

  /** 日志筛选项 */
  getLogActions(): string[] {
    return [...this.logActions];
  }

  getLogModules(): string[] {
    return [...this.logModules];
  }
}
