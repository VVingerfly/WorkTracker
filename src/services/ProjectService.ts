import type { Project, ProjectGroup, ProjectStatus, ProjectsData } from '../types';
import { FileService } from './FileService';
import { TaskService } from './TaskService';
import { ConfigService } from './ConfigService';

const DEFAULT_DATA: ProjectsData = { groups: [], projects: [] };

function generateId(): string {
  return crypto.randomUUID();
}

function migrateProject(raw: Partial<Project> & { id: string; groupId: string; name: string }, defaultPriority: string): Project {
  return {
    id: raw.id,
    groupId: raw.groupId,
    name: raw.name,
    description: raw.description ?? '',
    status: (raw.status as ProjectStatus) ?? 'active',
    priority: raw.priority ?? defaultPriority,
    color: raw.color,
    studioName: raw.studioName ?? '',
    contactPerson: raw.contactPerson ?? '',
    customFields: raw.customFields ?? [],
  };
}

export class ProjectService {
  private static data: ProjectsData | null = null;

  static async load(): Promise<ProjectsData> {
    if (!ProjectService.data) {
      const [raw, defaultPriority] = await Promise.all([
        FileService.readJson<ProjectsData>('projects.json', DEFAULT_DATA),
        ConfigService.getDefaultPriorityId(),
      ]);
      ProjectService.data = {
        groups: raw.groups ?? [],
        projects: (raw.projects ?? []).map((p) => migrateProject(p, defaultPriority)),
      };
    }
    return ProjectService.data;
  }

  static async save(): Promise<void> {
    if (ProjectService.data) {
      await FileService.writeJson('projects.json', ProjectService.data);
    }
  }

  static async getGroups(): Promise<ProjectGroup[]> {
    const data = await ProjectService.load();
    return [...data.groups];
  }

  static async getProjects(): Promise<Project[]> {
    const data = await ProjectService.load();
    return [...data.projects];
  }

  static async addGroup(name: string, description = '', color?: string): Promise<ProjectGroup> {
    const data = await ProjectService.load();
    const group: ProjectGroup = { id: generateId(), name, description, color };
    data.groups.push(group);
    await ProjectService.save();
    return group;
  }

  static async updateGroup(id: string, updates: Partial<ProjectGroup>): Promise<void> {
    const data = await ProjectService.load();
    const index = data.groups.findIndex((g) => g.id === id);
    if (index >= 0) {
      data.groups[index] = { ...data.groups[index], ...updates };
      await ProjectService.save();
    }
  }

  static async deleteGroup(id: string): Promise<void> {
    const data = await ProjectService.load();
    const projectIds = data.projects.filter((p) => p.groupId === id).map((p) => p.id);
    for (const pid of projectIds) {
      await TaskService.deleteByProject(pid);
    }
    data.groups = data.groups.filter((g) => g.id !== id);
    data.projects = data.projects.filter((p) => p.groupId !== id);
    await ProjectService.save();
  }

  static async addProject(groupId: string, fields: Partial<Project> & { name: string }): Promise<Project> {
    const [data, defaultPriority] = await Promise.all([
      ProjectService.load(),
      ConfigService.getDefaultPriorityId(),
    ]);
    const project: Project = migrateProject({
      id: generateId(),
      groupId,
      name: fields.name,
      description: fields.description,
      status: fields.status,
      priority: fields.priority,
      color: fields.color,
      studioName: fields.studioName,
      contactPerson: fields.contactPerson,
      customFields: fields.customFields,
    }, defaultPriority);
    data.projects.push(project);
    await ProjectService.save();
    return project;
  }

  static async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const data = await ProjectService.load();
    const index = data.projects.findIndex((p) => p.id === id);
    if (index >= 0) {
      data.projects[index] = { ...data.projects[index], ...updates };
      await ProjectService.save();
    }
  }

  static async deleteProject(id: string): Promise<void> {
    await TaskService.deleteByProject(id);
    const data = await ProjectService.load();
    data.projects = data.projects.filter((p) => p.id !== id);
    await ProjectService.save();
  }

  static async resetCache(): Promise<void> {
    ProjectService.data = null;
  }
}
