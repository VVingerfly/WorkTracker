export interface ProjectGroup {
  id: string;
  name: string;
  description: string;
}

export interface Project {
  id: string;
  groupId: string;
  name: string;
  description: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startTime: string | null;
  finishTime: string | null;
  workHours: number;
  remark: string;
}

export interface Leave {
  id: string;
  date: string;
  type: string;
  hours: number;
  remark: string;
}

export interface Config {
  monthStartDay: number;
  monthEndDay: number;
  dataPath: string;
}

export interface ProjectsData {
  groups: ProjectGroup[];
  projects: Project[];
}

export interface TasksData {
  tasks: Task[];
}

export interface LeaveData {
  leaves: Leave[];
}

export type PageKey = 'dashboard' | 'project' | 'statistics' | 'settings';

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
};
