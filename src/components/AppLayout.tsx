import React from 'react';
import { ConfigProvider, Layout, Menu, Modal, theme } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type { PageKey } from '../types';
import { isSettingsDirty, clearSettingsDirty } from '../pages/SettingsPage';

const { Sider, Content } = Layout;

interface AppLayoutProps {
  currentPage: PageKey;
  onPageChange: (page: PageKey) => void;
  children: React.ReactNode;
}

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'statistics', icon: <BarChartOutlined />, label: '统计' },
  { key: 'admin', icon: <TeamOutlined />, label: '管理' },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
];

export function AppLayout({ currentPage, onPageChange, children }: AppLayoutProps) {
  theme.useToken();

  function handleMenuClick(key: string) {
    const next = key as PageKey;
    if (next === currentPage) return;
    // 离开设置页时，如果有未保存的改动，提示用户
    if (currentPage === 'settings' && isSettingsDirty()) {
      Modal.confirm({
        title: '设置有未保存的更改',
        icon: <ExclamationCircleOutlined />,
        content: '您在设置页面修改了配置但尚未保存，是否保存？',
        okText: '保存并离开',
        cancelText: '不保存',
        okType: 'primary',
        onOk: async () => {
          // 触发设置页的保存按钮
          const saveBtn = document.querySelector<HTMLButtonElement>('#settings-save-btn');
          if (saveBtn) saveBtn.click();
          clearSettingsDirty();
          onPageChange(next);
        },
        onCancel: () => {
          clearSettingsDirty();
          onPageChange(next);
        },
      });
      return;
    }
    onPageChange(next);
  }

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
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <div style={{ height: 16 }} />
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
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
