import type { Project, ProjectGroup, ProjectsData } from '../types';
import { FileService } from './FileService';

const DEFAULT_DATA: ProjectsData = { groups: [], projects: [] };

function generateId(): string {
  return crypto.randomUUID();
}

export class ProjectService {
  private static data: ProjectsData | null = null;

  static async load(): Promise<ProjectsData> {
    if (!ProjectService.data) {
      ProjectService.data = await FileService.readJson('projects.json', DEFAULT_DATA);
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

  static async addGroup(name: string, description = ''): Promise<ProjectGroup> {
    const data = await ProjectService.load();
    const group: ProjectGroup = { id: generateId(), name, description };
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
    data.groups = data.groups.filter((g) => g.id !== id);
    data.projects = data.projects.filter((p) => p.groupId !== id);
    await ProjectService.save();
  }

  static async addProject(groupId: string, name: string, description = ''): Promise<Project> {
    const data = await ProjectService.load();
    const project: Project = { id: generateId(), groupId, name, description };
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
    const data = await ProjectService.load();
    data.projects = data.projects.filter((p) => p.id !== id);
    await ProjectService.save();
  }

  static async resetCache(): Promise<void> {
    ProjectService.data = null;
  }
}
