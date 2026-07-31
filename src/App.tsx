import { useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { AdminPage } from './pages/AdminPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { PageKey } from './types';
import { ConfigProvider } from './contexts/ConfigContext';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';

dayjs.locale('zh-cn');

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  const pages: Record<PageKey, JSX.Element> = {
    dashboard: <DashboardPage />,
    project: <ProjectPage />,
    admin: <AdminPage />,
    statistics: <StatisticsPage />,
    settings: <SettingsPage />,
  };

  return (
    <ConfigProvider>
      <AppLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        {pages[currentPage]}
      </AppLayout>
    </ConfigProvider>
  );
}

export default App;
