import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { StatisticsService } from './StatisticsService';
import { ConfigService } from './ConfigService';

export class ExportService {
  static async exportToExcel(month?: dayjs.Dayjs): Promise<void> {
    const [rows, summary, statuses] = await Promise.all([
      StatisticsService.getStatRows(month),
      StatisticsService.getMonthSummary(month),
      ConfigService.getTaskStatuses(),
    ]);
    const ref = month ?? dayjs();
    const statusMap = new Map(statuses.map((s) => [s.id, s.label]));

    const sheetData = [
      ['日期', '项目', '任务', '工时', '状态', '备注'],
      ...rows.map((r) => [
        r.date,
        r.projectName,
        r.taskTitle,
        r.workHours,
        statusMap.get(r.status) ?? r.status,
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
