import React from 'react';
import { ConfigProvider, Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  BarChartOutlined,
  SettingOutlined,
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
  { key: 'statistics', icon: <BarChartOutlined />, label: '统计' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="light" width={200} style={{ borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px', fontWeight: 600, fontSize: 18, textAlign: 'center' }}>
            WorkTracker
          </div>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => onPageChange(key as PageKey)}
          />
        </Sider>
        <Layout>
          <Content style={{ padding: 24, background: '#fff' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
