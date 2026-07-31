import { BaseDirectory, createDir, exists, readTextFile, writeTextFile } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { appDataDir, join } from '@tauri-apps/api/path';

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
  private static resolvedDataPath: string | null | undefined = undefined;

  static async resetResolvedPath(): Promise<void> {
    FileService.resolvedDataPath = undefined;
  }

  private static async resolveDataPath(): Promise<string | null> {
    if (!isTauri()) return null;
    if (FileService.resolvedDataPath !== undefined) return FileService.resolvedDataPath;

    try {
      await ensureDataDir();
      const configPath = 'data/config.json';
      const fileExists = await exists(configPath, { dir: BaseDirectory.AppData });
      if (fileExists) {
        const content = await readTextFile(configPath, { dir: BaseDirectory.AppData });
        const config = JSON.parse(content);
        FileService.resolvedDataPath = config.dataPath || null;
      } else {
        FileService.resolvedDataPath = null;
      }
    } catch {
      FileService.resolvedDataPath = null;
    }
    return FileService.resolvedDataPath as string | null;
  }

  static async readJson<T>(filename: string, defaultValue: T): Promise<T> {
    if (isTauri()) {
      // config.json 始终从 AppData 读取（引导配置）
      if (filename !== 'config.json') {
        const customPath = await FileService.resolveDataPath();
        if (customPath) {
          const fullPath = `${customPath}/${filename}`;
          const fileExists = await invoke<boolean>('file_exists_absolute', { path: fullPath });
          if (!fileExists) {
            await invoke('write_file_absolute', { path: fullPath, content: JSON.stringify(defaultValue, null, 2) });
            return defaultValue;
          }
          const content = await invoke<string>('read_file_absolute', { path: fullPath });
          return JSON.parse(content) as T;
        }
      }

      // 默认从 AppData 读取
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
      // config.json 始终写入 AppData
      if (filename !== 'config.json') {
        const customPath = await FileService.resolveDataPath();
        if (customPath) {
          await invoke('write_file_absolute', { path: `${customPath}/${filename}`, content });
          return;
        }
      }

      await ensureDataDir();
      await writeTextFile(`data/${filename}`, content, { dir: BaseDirectory.AppData });
      return;
    }
    localStorage.setItem(`${STORAGE_PREFIX}${filename}`, content);
  }

  static async getDataDir(): Promise<string> {
    if (!isTauri()) return '(浏览器模式)';
    const customPath = await FileService.resolveDataPath();
    if (customPath) return customPath;
    const appData = await appDataDir();
    return await join(appData, 'data');
  }

  static async openDataDir(): Promise<void> {
    if (!isTauri()) return;
    const dir = await FileService.getDataDir();
    await invoke('open_path', { path: dir });
  }

  static async changeDataDir(): Promise<string | null> {
    if (!isTauri()) return null;

    const selected = await open({ directory: true });
    if (!selected || typeof selected !== 'string') return null;

    const currentDir = await FileService.getDataDir();

    // 迁移数据文件（config.json 始终留在 AppData）
    const files = ['projects.json', 'tasks.json', 'leave.json'];
    for (const file of files) {
      const filePath = `${currentDir}/${file}`;
      const fileExists = await invoke<boolean>('file_exists_absolute', { path: filePath });
      if (fileExists) {
        const content = await invoke<string>('read_file_absolute', { path: filePath });
        await invoke('write_file_absolute', { path: `${selected}/${file}`, content });
      }
    }

    // 更新 config.dataPath（config.json 在 AppData）
    await ensureDataDir();
    const configPath = 'data/config.json';
    const configExists = await exists(configPath, { dir: BaseDirectory.AppData });
    if (configExists) {
      const content = await readTextFile(configPath, { dir: BaseDirectory.AppData });
      const config = JSON.parse(content);
      config.dataPath = selected;
      await writeTextFile(configPath, JSON.stringify(config, null, 2), { dir: BaseDirectory.AppData });
    }

    // 重置缓存
    await FileService.resetResolvedPath();

    return selected;
  }

  static async exportBackup(): Promise<string> {
    const files = ['config.json', 'projects.json', 'tasks.json', 'leave.json'];
    const backup: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const file of files) {
      try {
        if (isTauri()) {
          const data = await FileService.readJson(file, null);
          backup[file] = data;
        } else {
          const stored = localStorage.getItem(`${STORAGE_PREFIX}${file}`);
          backup[file] = stored ? JSON.parse(stored) : null;
        }
      } catch {
        backup[file] = null;
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
