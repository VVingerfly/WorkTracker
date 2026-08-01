import dayjs from 'dayjs';
import type { Leave, Task, TasksData } from '../types';
import { ConfigService } from './ConfigService';
import { FileService } from './FileService';

const DEFAULT_TASKS: TasksData = { tasks: [] };
const DEFAULT_LEAVE = { leaves: [] as Leave[] };

function generateId(): string {
  return crypto.randomUUID();
}

function migrateTask(raw: Partial<Task> & { id: string; projectId: string; title: string }): Task {
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    description: raw.description ?? '',
    priority: raw.priority ?? '',
    status: raw.status ?? '',
    startTime: raw.startTime ?? null,
    finishTime: raw.finishTime ?? null,
    workHours: typeof raw.workHours === 'number' ? raw.workHours : 0,
    remark: raw.remark ?? '',
  };
}

export class TaskService {
  private static tasks: TasksData | null = null;

  static async load(): Promise<TasksData> {
    if (!TaskService.tasks) {
      const raw = await FileService.readJson<TasksData>('tasks.json', DEFAULT_TASKS);
      TaskService.tasks = {
        tasks: (raw.tasks ?? []).map(migrateTask),
      };
    }
    return TaskService.tasks;
  }

  static async save(): Promise<void> {
    if (TaskService.tasks) {
      await FileService.writeJson('tasks.json', TaskService.tasks);
    }
  }

  static async getTasks(): Promise<Task[]> {
    const data = await TaskService.load();
    return [...data.tasks];
  }

  static async getTasksByProject(projectId: string): Promise<Task[]> {
    const tasks = await TaskService.getTasks();
    return tasks.filter((t) => t.projectId === projectId);
  }

  static async getTodayTasks(): Promise<Task[]> {
    const tasks = await TaskService.getTasks();
    const today = new Date().toISOString().slice(0, 10);
    const inProgressIds = (await ConfigService.getTaskStatuses())
      .filter((s) => s.id === 'in_progress' || s.label.includes('进行'))
      .map((s) => s.id);
    return tasks.filter((t) => {
      const start = t.startTime?.slice(0, 10);
      const finish = t.finishTime?.slice(0, 10);
      return start === today || finish === today || inProgressIds.includes(t.status);
    });
  }

  static async addTask(projectId: string, title: string): Promise<Task> {
    const data = await TaskService.load();
    const [priority, status] = await Promise.all([
      ConfigService.getDefaultPriorityId(),
      ConfigService.getDefaultStatusId(),
    ]);
    const task: Task = {
      id: generateId(),
      projectId,
      title,
      description: '',
      priority,
      status,
      startTime: dayjs().format('YYYY-MM-DD'),
      finishTime: null,
      workHours: 0,
      remark: '',
    };
    data.tasks.push(task);
    await TaskService.save();
    return task;
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const data = await TaskService.load();
    const index = data.tasks.findIndex((t) => t.id === id);
    if (index >= 0) {
      data.tasks[index] = { ...data.tasks[index], ...updates };
      await TaskService.save();
    }
  }

  static async deleteTask(id: string): Promise<void> {
    const data = await TaskService.load();
    data.tasks = data.tasks.filter((t) => t.id !== id);
    await TaskService.save();
  }

  static async deleteByProject(projectId: string): Promise<void> {
    const data = await TaskService.load();
    data.tasks = data.tasks.filter((t) => t.projectId !== projectId);
    await TaskService.save();
  }

  static async getLeaves(): Promise<Leave[]> {
    const data = await FileService.readJson('leave.json', DEFAULT_LEAVE);
    return [...data.leaves];
  }

  static async addLeave(leave: Omit<Leave, 'id'>): Promise<Leave> {
    const data = await FileService.readJson('leave.json', DEFAULT_LEAVE);
    const newLeave: Leave = { ...leave, id: generateId() };
    data.leaves.push(newLeave);
    await FileService.writeJson('leave.json', data);
    return newLeave;
  }

  static async resetCache(): Promise<void> {
    TaskService.tasks = null;
  }
}
