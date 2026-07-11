import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { DataService } from '../../core/services/data.service';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  trend: string;
  prefix?: string;
}

interface DashboardStats {
  cards: StatCard[];
  lineChart: {
    months: string[];
    series: { name: string; data: number[] }[];
  };
  barChart: {
    departments: string[];
    data: number[];
  };
  pieChart: { name: string; value: number }[];
  radarChart: {
    indicators: { name: string; max: number }[];
    data: { name: string; value: number[] }[];
  };
}

/** Seline 设计系统调色板 — 青色 + 石色中性 */
const SELINE_COLORS = [
  '#3ba6f1', // Cyan Signal — 主色
  '#a8a29e', // Ash Gray
  '#78716c', // Warm Gray
  '#d6d3d1', // Stone Muted
  '#c1e1f7', // Sky Wash
  '#3398e1', // Cyan Edge
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, NzGridModule, NzCardModule, NzIconModule, NzSpinModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private dataSvc = inject(DataService);

  loading = signal(true);
  cards = signal<StatCard[]>([]);
  lineOption = signal<EChartsOption | null>(null);
  barOption = signal<EChartsOption | null>(null);
  pieOption = signal<EChartsOption | null>(null);
  radarOption = signal<EChartsOption | null>(null);

  ngOnInit(): void {
    this.dataSvc.getDashboardStats().subscribe((stats: any) => {
      // 去除卡片 color 属性 — 统一使用 Seline 白卡片样式
      this.cards.set(stats.cards.map((c: any) => ({
        title: c.title,
        value: c.value,
        icon: c.icon,
        trend: c.trend,
        prefix: c.prefix
      })));
      this.lineOption.set(this.buildLineOption(stats.lineChart));
      this.barOption.set(this.buildBarOption(stats.barChart));
      this.pieOption.set(this.buildPieOption(stats.pieChart));
      this.radarOption.set(this.buildRadarOption(stats.radarChart));
      this.loading.set(false);
    });
  }

  isDown(trend: string): boolean {
    return trend.trim().startsWith('-');
  }

  private buildLineOption(data: DashboardStats['lineChart']): EChartsOption {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#0c0a09',
        borderColor: '#0c0a09',
        textStyle: { color: '#f5f5f4', fontSize: 12 },
        borderRadius: 6
      },
      legend: {
        data: data.series.map(s => s.name),
        bottom: 0,
        textStyle: { color: '#78716c', fontSize: 12 },
        itemWidth: 12,
        itemHeight: 12,
        icon: 'circle'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.months,
        axisLine: { lineStyle: { color: '#e8e6e5' } },
        axisLabel: { color: '#78716c', fontSize: 12 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e8e6e5', type: 'dashed' } },
        axisLabel: {
          color: '#78716c',
          fontSize: 12,
          formatter: (val: number | string) => {
            const num = Number(val);
            if (num >= 10000) {
              return num / 10000 + '万';
            }
            return String(val);
          }
        }
      },
      series: data.series.map((s, i) => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          opacity: i === 0 ? 0.08 : 0.04,
          color: SELINE_COLORS[i]
        },
        lineStyle: {
          width: 2,
          color: SELINE_COLORS[i]
        },
        itemStyle: {
          color: SELINE_COLORS[i],
          borderColor: '#fff',
          borderWidth: 2
        }
      }))
    };
  }

  private buildBarOption(data: DashboardStats['barChart']): EChartsOption {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0c0a09',
        borderColor: '#0c0a09',
        textStyle: { color: '#f5f5f4', fontSize: 12 },
        borderRadius: 6
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.departments,
        axisLine: { lineStyle: { color: '#e8e6e5' } },
        axisLabel: { color: '#78716c', fontSize: 12 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#e8e6e5', type: 'dashed' } },
        axisLabel: { color: '#78716c', fontSize: 12 }
      },
      series: [
        {
          name: '业绩',
          type: 'bar',
          data: data.data,
          barWidth: '40%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: '#3ba6f1'
          },
          emphasis: {
            itemStyle: {
              color: '#5bb6f4'
            }
          }
        }
      ]
    };
  }

  private buildPieOption(data: DashboardStats['pieChart']): EChartsOption {
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
        backgroundColor: '#0c0a09',
        borderColor: '#0c0a09',
        textStyle: { color: '#f5f5f4', fontSize: 12 },
        borderRadius: 6
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#78716c', fontSize: 12 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8
      },
      color: SELINE_COLORS,
      series: [
        {
          name: '业务板块',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 500,
              color: '#0c0a09'
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }
      ]
    };
  }

  private buildRadarOption(data: DashboardStats['radarChart']): EChartsOption {
    return {
      tooltip: {
        backgroundColor: '#0c0a09',
        borderColor: '#0c0a09',
        textStyle: { color: '#f5f5f4', fontSize: 12 },
        borderRadius: 6
      },
      radar: {
        indicator: data.indicators,
        radius: '65%',
        splitNumber: 5,
        axisName: {
          color: '#78716c',
          fontSize: 12
        },
        splitLine: {
          lineStyle: { color: '#e8e6e5' }
        },
        splitArea: {
          areaStyle: { color: ['rgba(250,250,249,0)', 'rgba(232,230,229,0.3)'] }
        },
        axisLine: {
          lineStyle: { color: '#e8e6e5' }
        }
      },
      series: [
        {
          name: '指标评分',
          type: 'radar',
          data: data.data.map((d, i) => ({
            value: d.value,
            name: d.name,
            areaStyle: { opacity: 0.1, color: SELINE_COLORS[i % SELINE_COLORS.length] },
            lineStyle: { width: 2, color: SELINE_COLORS[i % SELINE_COLORS.length] },
            itemStyle: { color: SELINE_COLORS[i % SELINE_COLORS.length] }
          }))
        }
      ]
    };
  }
}
