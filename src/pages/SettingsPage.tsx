import { useEffect, useRef } from 'react';
import { Button, Card, Form, InputNumber, Space, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { ConfigService } from '../services/ConfigService';
import { FileService } from '../services/FileService';
import { ExportService } from '../services/ExportService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Config } from '../types';

export function SettingsPage() {
  const [form] = Form.useForm<Config>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const config = await ConfigService.getConfig();
    form.setFieldsValue(config);
  }

  async function handleSave() {
    const values = await form.validateFields();
    await ConfigService.saveConfig(values);
    message.success('配置已保存');
  }

  async function handleBackup() {
    const content = await FileService.exportBackup();
    ExportService.downloadBackup(content);
    message.success('备份已下载');
  }

  async function handleRestore(file: File) {
    const content = await file.text();
    await FileService.importBackup(content);
    await ConfigService.resetCache();
    await ProjectService.resetCache();
    await TaskService.resetCache();
    await loadConfig();
    message.success('备份已恢复，请刷新页面查看最新数据');
  }

  return (
    <div>
      <h2>设置</h2>
      <Card title="统计周期" style={{ maxWidth: 480, marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="monthStartDay" label="月起始日" rules={[{ required: true }]}>
            <InputNumber min={1} max={31} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="monthEndDay" label="月结束日" rules={[{ required: true }]}>
            <InputNumber min={1} max={31} style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" onClick={handleSave}>保存配置</Button>
        </Form>
      </Card>

      <Card title="数据管理" style={{ maxWidth: 480 }}>
        <Space direction="vertical">
          <Button icon={<DownloadOutlined />} onClick={handleBackup}>导出备份</Button>
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>导入备份</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleRestore(file);
              e.target.value = '';
            }}
          />
        </Space>
      </Card>
    </div>
  );
}
