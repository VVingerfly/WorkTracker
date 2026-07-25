import type { Config } from '../types';
import { FileService } from './FileService';

const DEFAULT_CONFIG: Config = {
  monthStartDay: 1,
  monthEndDay: 31,
  dataPath: '',
};

export class ConfigService {
  private static config: Config | null = null;

  static async getConfig(): Promise<Config> {
    if (!ConfigService.config) {
      ConfigService.config = await FileService.readJson('config.json', DEFAULT_CONFIG);
    }
    return { ...ConfigService.config };
  }

  static async saveConfig(config: Config): Promise<void> {
    ConfigService.config = { ...config };
    await FileService.writeJson('config.json', ConfigService.config);
  }

  static async resetCache(): Promise<void> {
    ConfigService.config = null;
  }
}
