import dayjs from 'dayjs';
import type { Project, Task } from '../types';
import { ConfigService } from './ConfigService';
import { ProjectService } from './ProjectService';
import { TaskService } from './TaskService';

export interface StatRow {
  key: string;
  date: string;
  projectName: string;
  taskTitle: string;
  workHours: number;
  status: string;
  remark: string;
}

export interface MonthSummary {
  totalHours: number;
  taskCount: number;
  doneCount: number;
  leaveHours: number;
}

export class StatisticsService {
  static async getMonthRange(referenceDate = dayjs()): Promise<[dayjs.Dayjs, dayjs.Dayjs]> {
    const config = await ConfigService.getConfig();
    const year = referenceDate.year();
    const month = referenceDate.month();
    const start = dayjs(new Date(year, month, config.monthStartDay));
    let end = dayjs(new Date(year, month, config.monthEndDay));
    if (config.monthEndDay < config.monthStartDay) {
      end = end.add(1, 'month');
    }
    return [start, end];
  }

  static async getStatRows(month?: dayjs.Dayjs): Promise<StatRow[]> {
    const ref = month ?? dayjs();
    const [start, end] = await StatisticsService.getMonthRange(ref);
    const tasks = await TaskService.getTasks();
    const projects = await ProjectService.getProjects();
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    return tasks
      .filter((t) => StatisticsService.isTaskInRange(t, start, end))
      .map((t) => ({
        key: t.id,
        date: t.finishTime?.slice(0, 10) ?? t.startTime?.slice(0, 10) ?? '',
        projectName: projectMap.get(t.projectId) ?? '未知项目',
        taskTitle: t.title,
        workHours: t.workHours,
        status: t.status,
        remark: t.remark,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static async getMonthSummary(month?: dayjs.Dayjs): Promise<MonthSummary> {
    const ref = month ?? dayjs();
    const [start, end] = await StatisticsService.getMonthRange(ref);
    const tasks = await TaskService.getTasks();
    const leaves = await TaskService.getLeaves();

    const monthTasks = tasks.filter((t) => StatisticsService.isTaskInRange(t, start, end));
    const monthLeaves = leaves.filter((l) => {
      const d = dayjs(l.date);
      return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
    });

    return {
      totalHours: monthTasks.reduce((sum, t) => sum + t.workHours, 0),
      taskCount: monthTasks.length,
      doneCount: monthTasks.filter((t) => t.status === 'done').length,
      leaveHours: monthLeaves.reduce((sum, l) => sum + l.hours, 0),
    };
  }

  static async getTodaySummary(): Promise<{ tasks: Task[]; totalHours: number; projects: Project[] }> {
    const todayTasks = await TaskService.getTodayTasks();
    const projects = await ProjectService.getProjects();
    return {
      tasks: todayTasks,
      totalHours: todayTasks.reduce((sum, t) => sum + t.workHours, 0),
      projects,
    };
  }

  private static isTaskInRange(task: Task, start: dayjs.Dayjs, end: dayjs.Dayjs): boolean {
    const dateStr = task.finishTime ?? task.startTime;
    if (!dateStr) return false;
    const d = dayjs(dateStr.slice(0, 10));
    return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
  }
}
