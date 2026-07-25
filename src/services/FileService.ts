import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';

const STORAGE_PREFIX = 'worktracker:';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

async function ensureDataDir(): Promise<void> {
  if (!isTauri()) return;
  const hasDir = await exists('data', { dir: BaseDirectory.AppData });
  if (!hasDir) {
    await createDir('data', { dir: BaseDirectory.AppData, recursive: true });
  }
}

export class FileService {
  static async readJson<T>(filename: string, defaultValue: T): Promise<T> {
    if (isTauri()) {
      await ensureDataDir();
      const path = `data/${filename}`;
      const fileExists = await exists(path, { dir: BaseDirectory.AppData });
      if (!fileExists) {
        await writeTextFile(path, JSON.stringify(defaultValue, null, 2), {
          dir: BaseDirectory.AppData,
        });
        return defaultValue;
      }
      const content = await readTextFile(path, { dir: BaseDirectory.AppData });
      return JSON.parse(content) as T;
    }

    const stored = localStorage.getItem(`${STORAGE_PREFIX}${filename}`);
    if (!stored) {
      localStorage.setItem(`${STORAGE_PREFIX}${filename}`, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  }

  static async writeJson<T>(filename: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    if (isTauri()) {
      await ensureDataDir();
      await writeTextFile(`data/${filename}`, content, { dir: BaseDirectory.AppData });
      return;
    }
    localStorage.setItem(`${STORAGE_PREFIX}${filename}`, content);
  }

  static async exportBackup(): Promise<string> {
    const files = ['config.json', 'projects.json', 'tasks.json', 'leave.json'];
    const backup: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const file of files) {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${file}`);
      backup[file] = stored ? JSON.parse(stored) : null;
    }
    if (isTauri()) {
      for (const file of files) {
        const path = `data/${file}`;
        const fileExists = await exists(path, { dir: BaseDirectory.AppData });
        if (fileExists) {
          backup[file] = JSON.parse(await readTextFile(path, { dir: BaseDirectory.AppData }));
        }
      }
    }
    return JSON.stringify(backup, null, 2);
  }

  static async importBackup(jsonContent: string): Promise<void> {
    const backup = JSON.parse(jsonContent) as Record<string, unknown>;
    const files = ['config.json', 'projects.json', 'tasks.json', 'leave.json'];
    for (const file of files) {
      if (backup[file]) {
        await FileService.writeJson(file, backup[file]);
      }
    }
  }
}
