import type { Leave, LeaveData } from '../types';
import { FileService } from './FileService';

const DEFAULT_LEAVE_DATA: LeaveData = { leaves: [] };

function generateId(): string {
  return crypto.randomUUID();
}

export class LeaveService {
  private static data: LeaveData | null = null;

  static async load(): Promise<LeaveData> {
    if (!LeaveService.data) {
      LeaveService.data = await FileService.readJson('leave.json', DEFAULT_LEAVE_DATA);
    }
    return LeaveService.data;
  }

  static async save(): Promise<void> {
    if (LeaveService.data) {
      await FileService.writeJson('leave.json', LeaveService.data);
    }
  }

  static async getLeaves(): Promise<Leave[]> {
    const data = await LeaveService.load();
    return [...data.leaves];
  }

  static async addLeave(leave: Omit<Leave, 'id'>): Promise<Leave> {
    const data = await LeaveService.load();
    const newLeave: Leave = { ...leave, id: generateId() };
    data.leaves.push(newLeave);
    await LeaveService.save();
    return newLeave;
  }

  static async updateLeave(id: string, updates: Partial<Leave>): Promise<void> {
    const data = await LeaveService.load();
    const index = data.leaves.findIndex((l) => l.id === id);
    if (index >= 0) {
      data.leaves[index] = { ...data.leaves[index], ...updates };
      await LeaveService.save();
    }
  }

  static async deleteLeave(id: string): Promise<void> {
    const data = await LeaveService.load();
    data.leaves = data.leaves.filter((l) => l.id !== id);
    await LeaveService.save();
  }

  static async resetCache(): Promise<void> {
    LeaveService.data = null;
  }
}
