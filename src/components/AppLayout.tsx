import React from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type { PageKey } from '../types';

const { Sider, Content } = Layout;

interface AppLayoutProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: React.ReactNode;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'project', icon: <ProjectOutlined />, label: '项目' },
  { key: 'admin', icon: <TeamOutlined />, label: '管理' },
  { key: 'statistics', icon: <BarChartOutlined />, label: '统计' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  theme.useToken();

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <Sider
          width={240}
          style={{
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div
            style={{
              padding: '24px',
              fontWeight: 700,
              fontSize: 20,
              textAlign: 'center',
              color: '#fff',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '16px',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}
          >
            WorkTracker
          </div>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => onPageChange(key as PageKey)}
            style={{
              background: 'transparent',
              borderRight: 'none',
              color: '#cbd5e1',
            }}
            theme="dark"
          />
        </Sider>
        <Layout>
          <Content
            style={{
              padding: 24,
              minHeight: '100vh',
              background: '#f5f7fa',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
