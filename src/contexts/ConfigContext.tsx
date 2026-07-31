import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Config, PriorityOption, StatusOption } from '../types';
import { ConfigService } from '../services/ConfigService';

interface ConfigContextValue {
  config: Config | null;
  priorities: PriorityOption[];
  taskStatuses: StatusOption[];
  projectStatuses: StatusOption[];
  leaveTypes: StatusOption[];
  refreshConfig: () => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);

  async function refreshConfig() {
    await ConfigService.resetCache();
    const c = await ConfigService.getConfig();
    setConfig(c);
  }

  async function saveConfig(newConfig: Config) {
    await ConfigService.saveConfig(newConfig);
    await refreshConfig();
  }

  useEffect(() => {
    refreshConfig();
  }, []);

  const value: ConfigContextValue = {
    config,
    priorities: config?.priorities ?? [],
    taskStatuses: config?.taskStatuses ?? [],
    projectStatuses: config?.projectStatuses ?? [],
    leaveTypes: config?.leaveTypes ?? [],
    refreshConfig,
    saveConfig,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
