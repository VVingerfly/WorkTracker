import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { StatisticsService } from './StatisticsService';
import { TASK_STATUS_LABELS } from '../types';

export class ExportService {
  static async exportToExcel(month?: dayjs.Dayjs): Promise<void> {
    const rows = await StatisticsService.getStatRows(month);
    const summary = await StatisticsService.getMonthSummary(month);
    const ref = month ?? dayjs();

    const sheetData = [
      ['日期', '项目', '任务', '工时', '状态', '备注'],
      ...rows.map((r) => [
        r.date,
        r.projectName,
        r.taskTitle,
        r.workHours,
        TASK_STATUS_LABELS[r.status as keyof typeof TASK_STATUS_LABELS] ?? r.status,
        r.remark,
      ]),
      [],
      ['汇总', '', '', summary.totalHours, `完成 ${summary.doneCount}/${summary.taskCount}`, `请假 ${summary.leaveHours}h`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '工时统计');

    const filename = `WorkTracker_${ref.format('YYYY-MM')}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  static downloadBackup(content: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkTracker_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
