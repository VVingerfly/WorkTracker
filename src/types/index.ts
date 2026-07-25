export interface CustomField {
  key: string;
  label: string;
  value: string;
}

export type ProjectStatus = 'active' | 'delivered' | 'paused' | 'terminated';

export interface ProjectGroup {
  id: string;
  name: string;
  description: string;
  color?: string;
}

export interface Project {
  id: string;
  groupId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color?: string;
  studioName: string;
  contactPerson: string;
  customFields: CustomField[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
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

export interface PriorityOption {
  id: string;
  label: string;
  color: string;
}

export interface StatusOption {
  id: string;
  label: string;
  color: string;
}

export interface Config {
  monthStartDay: number;
  monthEndDay: number;
  weekStartDay: number;
  dataPath: string;
  priorities: PriorityOption[];
  taskStatuses: StatusOption[];
  projectStatuses: StatusOption[];
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

export type PageKey = 'dashboard' | 'project' | 'admin' | 'statistics' | 'settings';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: '进行中',
  delivered: '已交付',
  paused: '暂停',
  terminated: '终止',
};

export const DEFAULT_PRIORITIES: PriorityOption[] = [
  { id: 'low', label: '低', color: '#d9d9d9' },
  { id: 'medium', label: '中', color: '#fa8c16' },
  { id: 'high', label: '高', color: '#f5222d' },
];

export const DEFAULT_TASK_STATUSES: StatusOption[] = [
  { id: 'todo', label: '待办', color: '#d9d9d9' },
  { id: 'in_progress', label: '进行中', color: '#1677ff' },
  { id: 'done', label: '已完成', color: '#52c41a' },
];

export const DEFAULT_PROJECT_STATUSES: StatusOption[] = [
  { id: 'active', label: '进行中', color: '#52c41a' },
  { id: 'delivered', label: '已交付', color: '#1677ff' },
  { id: 'paused', label: '暂停', color: '#fa8c16' },
  { id: 'terminated', label: '终止', color: '#f5222d' },
];

export const DEFAULT_CONFIG: Config = {
  monthStartDay: 26,
  monthEndDay: 25,
  weekStartDay: 4,
  dataPath: '',
  priorities: DEFAULT_PRIORITIES,
  taskStatuses: DEFAULT_TASK_STATUSES,
  projectStatuses: DEFAULT_PROJECT_STATUSES,
};
