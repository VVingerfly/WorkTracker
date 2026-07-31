import type { Config, PriorityOption, StatusOption } from '../types';
import { DEFAULT_CONFIG, DEFAULT_PRIORITIES, DEFAULT_TASK_STATUSES, DEFAULT_PROJECT_STATUSES, DEFAULT_LEAVE_TYPES } from '../types';
import { FileService } from './FileService';

function mergeConfig(raw: Partial<Config>): Config {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    priorities: raw.priorities?.length ? raw.priorities : DEFAULT_PRIORITIES,
    taskStatuses: raw.taskStatuses?.length ? raw.taskStatuses : DEFAULT_TASK_STATUSES,
    projectStatuses: raw.projectStatuses?.length ? raw.projectStatuses : DEFAULT_PROJECT_STATUSES,
    leaveTypes: raw.leaveTypes?.length ? raw.leaveTypes : DEFAULT_LEAVE_TYPES,
  };
}

export class ConfigService {
  private static config: Config | null = null;

  static async getConfig(): Promise<Config> {
    if (!ConfigService.config) {
      const raw = await FileService.readJson<Partial<Config>>('config.json', DEFAULT_CONFIG);
      ConfigService.config = mergeConfig(raw);
    }
    return { 
      ...ConfigService.config, 
      priorities: [...ConfigService.config.priorities], 
      taskStatuses: [...ConfigService.config.taskStatuses],
      projectStatuses: [...ConfigService.config.projectStatuses],
    };
  }

  static async getPriorities(): Promise<PriorityOption[]> {
    const config = await ConfigService.getConfig();
    return config.priorities;
  }

  static async getTaskStatuses(): Promise<StatusOption[]> {
    const config = await ConfigService.getConfig();
    return config.taskStatuses;
  }

  static async getProjectStatuses(): Promise<StatusOption[]> {
    const config = await ConfigService.getConfig();
    return config.projectStatuses;
  }

  static async getLeaveTypes(): Promise<StatusOption[]> {
    const config = await ConfigService.getConfig();
    return config.leaveTypes;
  }

  static async getDefaultPriorityId(): Promise<string> {
    const priorities = await ConfigService.getPriorities();
    return priorities[0]?.id ?? 'medium';
  }

  static async getDefaultStatusId(): Promise<string> {
    const statuses = await ConfigService.getTaskStatuses();
    return statuses.find((s) => s.id === 'todo')?.id ?? statuses[0]?.id ?? 'todo';
  }

  static async getDoneStatusIds(): Promise<string[]> {
    const statuses = await ConfigService.getTaskStatuses();
    const done = statuses.find((s) => s.id === 'done');
    return done ? [done.id] : statuses.filter((s) => s.label.includes('完成')).map((s) => s.id);
  }

  static async saveConfig(config: Config): Promise<void> {
    ConfigService.config = mergeConfig(config);
    await FileService.writeJson('config.json', ConfigService.config);
  }

  static async resetCache(): Promise<void> {
    ConfigService.config = null;
  }
}
