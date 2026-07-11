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
  color: string;
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
    this.dataSvc.getDashboardStats().subscribe((stats: DashboardStats) => {
      this.cards.set(stats.cards);
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
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: data.series.map(s => s.name),
        bottom: 0
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
        data: data.months
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number | string) => {
            const num = Number(val);
            if (num >= 10000) {
              return num / 10000 + '万';
            }
            return String(val);
          }
        }
      },
      series: data.series.map(s => ({
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: true,
        areaStyle: { opacity: 0.15 },
        lineStyle: { width: 3 }
      }))
    };
  }

  private buildBarOption(data: DashboardStats['barChart']): EChartsOption {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
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
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '业绩',
          type: 'bar',
          data: data.data,
          barWidth: '50%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]
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
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center'
      },
      series: [
        {
          name: '业务板块',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
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
              fontWeight: 'bold'
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
      tooltip: {},
      radar: {
        indicator: data.indicators,
        radius: '65%',
        splitNumber: 5,
        axisName: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          lineStyle: { color: '#e8e8e8' }
        },
        splitArea: {
          areaStyle: { color: ['#fafafa', '#fff'] }
        },
        axisLine: {
          lineStyle: { color: '#e8e8e8' }
        }
      },
      series: [
        {
          name: '指标评分',
          type: 'radar',
          data: data.data.map(d => ({
            value: d.value,
            name: d.name
          })),
          areaStyle: { opacity: 0.2 },
          lineStyle: { width: 2 }
        }
      ]
    };
  }
}
