import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzUploadModule, NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzImageService } from 'ng-zorro-antd/image';
import { Observable, of, Subscription } from 'rxjs';

import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';

import { LogService } from '../../core/services/log.service';

interface ParsedRow {
  [key: string]: any;
  _dup?: boolean;
  _editing?: boolean;
}

interface UploadedFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
  percent: number;
  url?: string;
  thumbUrl?: string;
}

@Component({
  selector: 'app-file-center',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzTabsModule, NzTableModule, NzCardModule, NzButtonModule, NzInputModule,
    NzIconModule, NzUploadModule, NzProgressModule, NzTagModule, NzEmptyModule,
    NzDividerModule, NzToolTipModule
  ],
  template: `
    <div class="page-container">
      <nz-card class="file-card">
        <nz-tabset [nzSelectedIndex]="activeTab()" (nzSelectedIndexChange)="onTabChange($event)">
          <!-- Tab1 Excel 导入解析 -->
          <nz-tab nzTitle="Excel 导入解析" nzIcon="file-excel">
            <div class="tab-content">
              <div class="upload-area">
                <nz-upload
                  nzType="drag"
                  [nzMultiple]="false"
                  [nzShowUploadList]="false"
                  [nzBeforeUpload]="beforeExcelUpload">
                  <p class="upload-drag-icon"><span nz-icon nzType="inbox" nzTheme="outline"></span></p>
                  <p class="upload-text">点击或拖拽 Excel 文件到此区域上传</p>
                  <p class="upload-hint">支持 .xlsx、.xls 格式文件，仅在前端解析</p>
                </nz-upload>
                <button nz-button (click)="downloadTemplate()" class="ml-8">
                  <span nz-icon nzType="download"></span>下载导入模板
                </button>
              </div>

              @if (excelData().length > 0) {
                <div class="data-preview">
                  <div class="preview-header">
                    <span class="preview-title">解析结果（共 {{ excelData().length }} 行，{{ excelColumns().length }} 列）</span>
                    <div class="preview-actions">
                      <span class="dup-tip" *ngIf="dupCount() > 0">
                        <nz-tag nzColor="warning">检测到 {{ dupCount() }} 条重复数据</nz-tag>
                      </span>
                      <button nz-button nzSize="small" (click)="clearExcelData()">
                        <span nz-icon nzType="clear"></span>清空
                      </button>
                      <button nz-button nzSize="small" nzType="primary" (click)="batchImport()" [nzLoading]="importing()">
                        <span nz-icon nzType="cloud-upload"></span>批量导入
                      </button>
                    </div>
                  </div>

                  <nz-table #excelTable [nzData]="excelData()" [nzPageSize]="8" nzSize="small" [nzScroll]="{ x: '800px' }">
                    <thead>
                      <tr>
                        <th nzWidth="60px">行号</th>
                        @for (col of excelColumns(); track col) {
                          <th>{{ col }}</th>
                        }
                        <th nzWidth="80px">重复</th>
                        <th nzWidth="100px">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of excelTable.data; track $index; let i = $index) {
                        <tr [class.dup-row]="row._dup">
                          <td>{{ i + 1 }}</td>
                          @for (col of excelColumns(); track col) {
                            <td (dblclick)="startExcelEdit(row, col)">
                              @if (row._editing && editingCol() === col) {
                                <input nz-input [ngModel]="row[col]" (ngModelChange)="row[col] = $event"
                                  (blur)="row._editing = false" (keyup.enter)="row._editing = false" />
                              } @else {
                                {{ row[col] ?? '-' }}
                              }
                            </td>
                          }
                          <td>
                            @if (row._dup) {
                              <nz-tag nzColor="orange">重复</nz-tag>
                            } @else {
                              <nz-tag nzColor="green">正常</nz-tag>
                            }
                          </td>
                          <td>
                            <button nz-button nzType="link" nzSize="small" nzDanger (click)="removeExcelRow(i)">
                              <span nz-icon nzType="delete"></span>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </nz-table>
                </div>
              } @else {
                <nz-empty class="empty-block" nzDescription="上传 Excel 文件后将在此显示解析结果"></nz-empty>
              }
            </div>
          </nz-tab>

          <!-- Tab2 Word 解析 -->
          <nz-tab nzTitle="Word 解析" nzIcon="file-word">
            <div class="tab-content">
              <div class="upload-area">
                <nz-upload
                  nzType="drag"
                  [nzMultiple]="false"
                  [nzShowUploadList]="false"
                  [nzBeforeUpload]="beforeWordUpload">
                  <p class="upload-drag-icon"><span nz-icon nzType="inbox" nzTheme="outline"></span></p>
                  <p class="upload-text">点击或拖拽 Word 文件到此区域上传</p>
                  <p class="upload-hint">支持 .docx 格式文件，前端解析提取纯文本</p>
                </nz-upload>
              </div>

              @if (wordLoading()) {
                <div class="loading-block">
                  <span nz-icon nzType="loading" nzTheme="outline"></span> 正在解析 Word 文档...
                </div>
              }

              @if (wordParagraphs().length > 0) {
                <div class="word-result">
                  <div class="word-header">
                    <span class="preview-title">{{ wordFileName() }} - 解析结果（{{ wordParagraphs().length }} 段）</span>
                    <div class="preview-actions">
                      <button nz-button nzSize="small" (click)="copyWordText()">
                        <span nz-icon nzType="copy"></span>复制全文
                      </button>
                      <button nz-button nzSize="small" (click)="downloadWordText()">
                        <span nz-icon nzType="download"></span>下载文本
                      </button>
                      <button nz-button nzSize="small" nzDanger (click)="clearWord()">
                        <span nz-icon nzType="clear"></span>清空
                      </button>
                    </div>
                  </div>
                  <div class="word-paragraphs">
                    @for (p of wordParagraphs(); track $index; let i = $index) {
                      <div class="paragraph-item">
                        <span class="para-index">P{{ i + 1 }}</span>
                        <span class="para-text">{{ p }}</span>
                      </div>
                    }
                  </div>
                </div>
              } @else if (!wordLoading()) {
                <nz-empty class="empty-block" nzDescription="上传 Word 文件后将在此显示解析结果"></nz-empty>
              }
            </div>
          </nz-tab>

          <!-- Tab3 通用文件上传 -->
          <nz-tab nzTitle="通用文件上传" nzIcon="cloud-upload">
            <div class="tab-content">
              <div class="upload-hint-card">
                <nz-divider nzText="上传限制" nzOrientation="left"></nz-divider>
                <div class="limit-list">
                  <nz-tag nzColor="blue">图片 &lt; 5MB</nz-tag>
                  <nz-tag nzColor="red">PDF &lt; 10MB</nz-tag>
                  <nz-tag nzColor="orange">压缩包 &lt; 20MB</nz-tag>
                  <nz-tag>支持格式：图片/PDF/ZIP/RAR/7Z</nz-tag>
                </div>
              </div>

              <nz-upload
                nzType="drag"
                [nzMultiple]="true"
                [nzFileList]="fileList()"
                [nzCustomRequest]="customUpload"
                [nzBeforeUpload]="beforeFileUpload"
                (nzChange)="onFileChange($event)"
                [nzPreview]="handlePreview"
                [nzPreviewFile]="previewFile">
                <p class="upload-drag-icon"><span nz-icon nzType="inbox" nzTheme="outline"></span></p>
                <p class="upload-text">点击或拖拽文件到此区域上传</p>
                <p class="upload-hint">支持图片、PDF、压缩包多文件上传</p>
              </nz-upload>

              @if (fileList().length > 0) {
                <div class="upload-list-section">
                  <div class="preview-header">
                    <span class="preview-title">上传列表（{{ fileList().length }} 个文件）</span>
                    <button nz-button nzSize="small" nzDanger (click)="clearFileList()">
                      <span nz-icon nzType="delete"></span>清空列表
                    </button>
                  </div>
                  <div class="file-list">
                    @for (f of fileList(); track f.uid) {
                      <div class="file-item">
                        <div class="file-icon">
                          @if (f.thumbUrl) {
                            <img [src]="f.thumbUrl" class="file-thumb" (click)="previewImage(f)" />
                          } @else {
                            <span nz-icon [nzType]="getFileIcon(f.name)" class="big-icon"></span>
                          }
                        </div>
                        <div class="file-info">
                          <div class="file-name" [title]="f.name">{{ f.name }}</div>
                          <div class="file-meta">
                            <span>{{ formatSize(f.size) }}</span>
                            <nz-tag [nzColor]="getStatusColor(f.status)">
                              {{ getStatusText(f.status) }}
                            </nz-tag>
                          </div>
                          @if (f.status === 'uploading') {
                            <nz-progress [nzPercent]="f.percent" nzSize="small"></nz-progress>
                          }
                        </div>
                        <div class="file-actions">
                          @if (f.thumbUrl) {
                            <button nz-button nzType="link" nzSize="small" (click)="previewImage(f)" nz-tooltip="预览大图">
                              <span nz-icon nzType="eye"></span>
                            </button>
                          }
                          <button nz-button nzType="link" nzSize="small" nzDanger (click)="removeFile(f.uid)" nz-tooltip="删除">
                            <span nz-icon nzType="delete"></span>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </nz-tab>
        </nz-tabset>
      </nz-card>
    </div>
  `,
  styles: [`
    .page-container { width: 100%; }
    .file-card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .tab-content { padding: 8px 0; }
    .upload-area {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .upload-area nz-upload { flex: 1; }
    .upload-drag-icon {
      color: #1890ff; font-size: 40px; margin: 8px 0;
      nz-icon { font-size: 40px; }
    }
    .upload-text { font-size: 14px; margin: 4px 0; }
    .upload-hint { color: #888; font-size: 12px; margin: 0; }
    .ml-8 { margin-left: 8px; }
    .data-preview, .word-result, .upload-list-section { margin-top: 16px; }
    .preview-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
    }
    .preview-title { font-weight: 600; font-size: 14px; }
    .preview-actions { display: flex; gap: 8px; align-items: center; }
    .dup-row { background: #fffbe6 !important; }
    .empty-block, .loading-block { padding: 40px 0; text-align: center; color: #999; }
    .loading-block span { margin-right: 6px; }
    .word-paragraphs {
      max-height: 480px; overflow: auto; border: 1px solid #f0f0f0; border-radius: 4px;
    }
    .paragraph-item {
      display: flex; gap: 10px; padding: 10px 14px; border-bottom: 1px solid #f5f5f5;
      &:last-child { border-bottom: none; }
    }
    .para-index {
      flex-shrink: 0; color: #1890ff; font-size: 12px; font-weight: 600; width: 36px;
    }
    .para-text { flex: 1; line-height: 1.6; word-break: break-all; white-space: pre-wrap; }
    .upload-hint-card { margin-bottom: 16px; }
    .limit-list { display: flex; gap: 8px; flex-wrap: wrap; }
    .file-list { display: flex; flex-direction: column; gap: 8px; }
    .file-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      border: 1px solid #f0f0f0; border-radius: 6px; background: #fafafa;
    }
    .file-icon { flex-shrink: 0; }
    .file-thumb {
      width: 48px; height: 48px; object-fit: cover; border-radius: 4px; cursor: pointer;
      border: 1px solid #e8e8e8;
    }
    .big-icon { font-size: 36px; color: #1890ff; }
    .file-info { flex: 1; min-width: 0; }
    .file-name {
      font-size: 13px; font-weight: 500; margin-bottom: 4px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .file-meta {
      display: flex; gap: 8px; align-items: center; font-size: 12px; color: #888;
    }
    .file-actions { flex-shrink: 0; display: flex; gap: 2px; }
  `]
})
export class FileCenterComponent {
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private logSvc = inject(LogService);
  private imageSvc = inject(NzImageService);

  activeTab = signal(0);

  // ===== Tab1 Excel =====
  excelData = signal<ParsedRow[]>([]);
  excelColumns = signal<string[]>([]);
  dupCount = signal(0);
  importing = signal(false);
  editingCol = signal<string>('');

  // ===== Tab2 Word =====
  wordParagraphs = signal<string[]>([]);
  wordFileName = signal('');
  wordLoading = signal(false);

  // ===== Tab3 通用上传 =====
  fileList = signal<UploadedFile[]>([]);

  // ============ Tab 切换 ============
  onTabChange(index: number): void {
    const names = ['Excel导入解析', 'Word解析', '通用文件上传'];
    this.activeTab.set(index);
    this.logSvc.log('切换Tab', '文件中心', `切换到：${names[index]}`);
  }

  // ============ Tab1: Excel 解析 ============
  beforeExcelUpload = (file: NzUploadFile): boolean => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name || '');
    if (!isExcel) {
      this.message.error('仅支持 .xlsx、.xls 格式文件');
      return false;
    }
    const rawFile = file.originFileObj as File;
    if (rawFile) {
      this.parseExcel(rawFile);
    }
    return false; // 阻止自动上传
  };

  parseExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (json.length === 0) {
          this.message.warning('Excel 文件为空');
          return;
        }
        const headers = json[0].map((h: any, i: number) => String(h || `列${i + 1}`));
        const rows: ParsedRow[] = json.slice(1).map(arr => {
          const obj: ParsedRow = {};
          headers.forEach((h, i) => (obj[h] = arr[i] ?? ''));
          return obj;
        });
        // 重复检测：按第一个字段判断
        this.detectDuplicates(rows, headers[0]);
        this.excelColumns.set(headers);
        this.excelData.set(rows);
        this.logSvc.log('Excel解析', '文件中心', `解析 ${file.name}，共 ${rows.length} 行`);
        this.message.success(`解析成功，共 ${rows.length} 行数据`);
      } catch (err) {
        this.message.error('Excel 解析失败：' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  detectDuplicates(rows: ParsedRow[], keyField: string): void {
    const seen = new Map<string, number>();
    let dup = 0;
    rows.forEach(r => {
      const key = String(r[keyField] ?? '').trim();
      if (key && seen.has(key)) {
        r._dup = true;
        dup++;
      } else {
        seen.set(key, 1);
      }
    });
    this.dupCount.set(dup);
    if (dup > 0) {
      this.modal.warning({
        nzTitle: '检测到重复数据',
        nzContent: `解析的数据中发现 ${dup} 条重复记录（按字段「${keyField}」判断），已在表格中标记。`,
        nzOkText: '我知道了'
      });
    }
  }

  startExcelEdit(row: ParsedRow, col: string): void {
    row._editing = true;
    this.editingCol.set(col);
    this.excelData.set([...this.excelData()]);
  }

  removeExcelRow(index: number): void {
    const rows = [...this.excelData()];
    rows.splice(index, 1);
    this.excelData.set(rows);
    this.recountDuplicates();
    this.message.success('已删除该行');
  }

  recountDuplicates(): void {
    const cols = this.excelColumns();
    if (cols.length === 0) return;
    const keyField = cols[0];
    const seen = new Map<string, number>();
    let dup = 0;
    this.excelData().forEach(r => {
      r._dup = false;
      const key = String(r[keyField] ?? '').trim();
      if (key && seen.has(key)) {
        r._dup = true;
        dup++;
      } else {
        seen.set(key, 1);
      }
    });
    this.dupCount.set(dup);
  }

  clearExcelData(): void {
    this.excelData.set([]);
    this.excelColumns.set([]);
    this.dupCount.set(0);
    this.message.info('已清空解析结果');
  }

  batchImport(): void {
    if (this.excelData().length === 0) return;
    this.importing.set(true);
    setTimeout(() => {
      this.importing.set(false);
      this.logSvc.log('批量导入', '文件中心', `批量导入 ${this.excelData().length} 条 Excel 数据`);
      this.message.success(`成功导入 ${this.excelData().length} 条数据（模拟）`);
      this.clearExcelData();
    }, 1200);
  }

  downloadTemplate(): void {
    const data = [
      { '订单名称': '订单-0001', '类别': '软件产品', '金额': 12000, '部门': '技术部', '日期': '2026-01-15' },
      { '订单名称': '订单-0002', '类别': '硬件设备', '金额': 8500, '部门': '市场部', '日期': '2026-02-20' }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    this.logSvc.log('下载模板', '文件中心', '下载 Excel 导入模板');
    this.message.success('模板已下载');
  }

  // ============ Tab2: Word 解析 ============
  beforeWordUpload = (file: NzUploadFile): boolean => {
    const isDocx = /\.docx$/i.test(file.name || '');
    if (!isDocx) {
      this.message.error('仅支持 .docx 格式文件（不支持 .doc）');
      return false;
    }
    const rawFile = file.originFileObj as File;
    if (rawFile) {
      this.parseWord(rawFile);
    }
    return false;
  };

  parseWord(file: File): void {
    this.wordLoading.set(true);
    this.wordFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target!.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value || '';
        // 按段落分割（空行或换行分段）
        const paragraphs = text
          .split(/\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        this.wordParagraphs.set(paragraphs);
        this.logSvc.log('Word解析', '文件中心', `解析 ${file.name}，共 ${paragraphs.length} 段`);
        this.message.success(`解析成功，共提取 ${paragraphs.length} 段文本`);
      } catch (err) {
        this.message.error('Word 解析失败：' + (err as Error).message);
        this.wordParagraphs.set([]);
      } finally {
        this.wordLoading.set(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  copyWordText(): void {
    const text = this.wordParagraphs().join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      this.message.success('已复制全文到剪贴板');
    }).catch(() => {
      this.message.error('复制失败');
    });
  }

  downloadWordText(): void {
    const text = this.wordParagraphs().join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.wordFileName().replace(/\.docx$/i, '') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    this.logSvc.log('下载文本', '文件中心', '下载 Word 解析文本');
    this.message.success('文本已下载');
  }

  clearWord(): void {
    this.wordParagraphs.set([]);
    this.wordFileName.set('');
    this.message.info('已清空');
  }

  // ============ Tab3: 通用文件上传 ============
  beforeFileUpload = (file: NzUploadFile): boolean => {
    const f = file as unknown as File;
    const ext = f.name.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(ext);
    const isPdf = /\.pdf$/.test(ext);
    const isZip = /\.(zip|rar|7z|tar|gz)$/.test(ext);

    if (!isImage && !isPdf && !isZip) {
      this.message.error('不支持的文件格式');
      return false;
    }
    const sizeMB = f.size / 1024 / 1024;
    if (isImage && sizeMB > 5) {
      this.message.error(`图片文件不能超过 5MB，当前 ${sizeMB.toFixed(2)}MB`);
      return false;
    }
    if (isPdf && sizeMB > 10) {
      this.message.error(`PDF 文件不能超过 10MB，当前 ${sizeMB.toFixed(2)}MB`);
      return false;
    }
    if (isZip && sizeMB > 20) {
      this.message.error(`压缩包文件不能超过 20MB，当前 ${sizeMB.toFixed(2)}MB`);
      return false;
    }
    return true;
  };

  customUpload = (item: NzUploadXHRArgs): Subscription => {
    const { file, onSuccess, onProgress } = item;
    const f = file as unknown as File;
    const uid = String(file.uid || Date.now() + '-' + Math.random());

    // 生成缩略图（图片）
    let thumbUrl: string | undefined;
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(f.name.toLowerCase())) {
      const reader = new FileReader();
      reader.onload = () => { thumbUrl = reader.result as string; };
      reader.readAsDataURL(f);
    }

    // 模拟上传进度
    let percent = 0;
    const timer = setInterval(() => {
      percent += Math.random() * 20;
      if (percent >= 100) {
        percent = 100;
        clearInterval(timer);
        onProgress?.({ percent: 100 }, file);
        onSuccess?.({}, file, new XMLHttpRequest());
        const uploaded: UploadedFile = {
          uid, name: f.name, size: f.size, type: f.type,
          status: 'done', percent: 100, url: thumbUrl, thumbUrl
        };
        this.updateFileInList(uploaded);
        this.logSvc.log('文件上传', '文件中心', `上传文件：${f.name}（${this.formatSize(f.size)}）`);
      } else {
        onProgress?.({ percent: Math.floor(percent) }, file);
        this.updateFileInList({
          uid, name: f.name, size: f.size, type: f.type,
          status: 'uploading', percent: Math.floor(percent)
        });
      }
    }, 250);

    // 返回带清理逻辑的 Subscription
    return new Subscription(() => clearInterval(timer));
  };

  onFileChange(event: any): void {
    // 同步文件列表状态
    if (event.type === 'success' || event.type === 'progress' || event.type === 'removed') {
      // 由 customUpload 中维护，此处无需额外处理
    }
  }

  updateFileInList(file: UploadedFile): void {
    const list = [...this.fileList()];
    const idx = list.findIndex(f => f.uid === file.uid);
    if (idx >= 0) {
      list[idx] = file;
    } else {
      list.push(file);
    }
    this.fileList.set(list);
  }

  removeFile(uid: string): void {
    this.modal.confirm({
      nzTitle: '确认删除？',
      nzContent: '确定要从上传列表中删除该文件吗？',
      nzOnOk: () => {
        this.fileList.set(this.fileList().filter(f => f.uid !== uid));
        this.logSvc.log('删除文件', '文件中心', `删除上传文件：${uid}`);
        this.message.success('已删除');
      }
    });
  }

  clearFileList(): void {
    this.modal.confirm({
      nzTitle: '确认清空？',
      nzContent: '将清空所有上传文件，此操作不可恢复。',
      nzOnOk: () => {
        this.fileList.set([]);
        this.message.success('已清空上传列表');
      }
    });
  }

  handlePreview = (file: NzUploadFile): boolean => {
    const src = file.thumbUrl || file.url;
    if (src) {
      this.imageSvc.preview([{ src }]);
    }
    return false;
  };

  previewFile = (file: NzUploadFile): Observable<string> => {
    return of(file.thumbUrl || file.url || '');
  };

  previewImage(f: UploadedFile): void {
    if (f.thumbUrl) {
      const images = this.fileList()
        .filter(item => item.thumbUrl)
        .map(item => ({ src: item.thumbUrl! }));
      this.imageSvc.preview(images.length ? images : [{ src: f.thumbUrl }]);
    }
  }

  // ============ 工具方法 ============
  getFileIcon(name: string): string {
    const ext = name.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(ext)) return 'file-image';
    if (/\.pdf$/.test(ext)) return 'file-pdf';
    if (/\.(zip|rar|7z|tar|gz)$/.test(ext)) return 'file-zip';
    return 'file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  getStatusColor(status: string): string {
    return status === 'done' ? 'green' : status === 'uploading' ? 'blue' : 'red';
  }

  getStatusText(status: string): string {
    return status === 'done' ? '已完成' : status === 'uploading' ? '上传中' : '失败';
  }
}
