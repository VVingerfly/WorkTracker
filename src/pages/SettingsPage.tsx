import { useEffect, useState } from 'react';
import { Button, Card, Collapse, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from 'antd';
import { DownloadOutlined, UploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ConfigService } from '../services/ConfigService';
import { FileService } from '../services/FileService';
import { ExportService } from '../services/ExportService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Config, PriorityOption, StatusOption } from '../types';

const COLOR_OPTIONS = ['#1677ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2', '#faad14', '#eb2f96'];

export function SettingsPage() {
  const [form] = Form.useForm<Config>();
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<StatusOption[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<StatusOption[]>([]);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [projectStatusModalOpen, setProjectStatusModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<PriorityOption | null>(null);
  const [editingStatus, setEditingStatus] = useState<StatusOption | null>(null);
  const [editingProjectStatus, setEditingProjectStatus] = useState<StatusOption | null>(null);
  const [priorityForm] = Form.useForm<PriorityOption>();
  const [statusForm] = Form.useForm<StatusOption>();
  const [projectStatusForm] = Form.useForm<StatusOption>();
  const [priorityColor, setPriorityColor] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('');
  const [projectStatusColor, setProjectStatusColor] = useState<string>('');

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const config = await ConfigService.getConfig();
    form.setFieldsValue(config);
    setPriorities(config.priorities);
    setTaskStatuses(config.taskStatuses);
    setProjectStatuses(config.projectStatuses);
  }

  async function handleSave() {
    const values = await form.validateFields();
    values.priorities = priorities;
    values.taskStatuses = taskStatuses;
    values.projectStatuses = projectStatuses;
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

  async function handleSavePriority() {
    const values = await priorityForm.validateFields();
    if (editingPriority) {
      setPriorities(priorities.map((p) => p.id === editingPriority.id ? values : p));
    } else {
      setPriorities([...priorities, values]);
    }
    setPriorityModalOpen(false);
    priorityForm.resetFields();
    setEditingPriority(null);
    message.success('优先级已保存');
  }

  async function handleDeletePriority(id: string) {
    if (priorities.length <= 1) {
      message.warning('至少保留一个优先级');
      return;
    }
    setPriorities(priorities.filter((p) => p.id !== id));
    message.success('优先级已删除');
  }

  async function handleSaveStatus() {
    const values = await statusForm.validateFields();
    if (editingStatus) {
      setTaskStatuses(taskStatuses.map((s) => s.id === editingStatus.id ? values : s));
    } else {
      setTaskStatuses([...taskStatuses, values]);
    }
    setStatusModalOpen(false);
    statusForm.resetFields();
    setEditingStatus(null);
    message.success('状态已保存');
  }

  async function handleDeleteStatus(id: string) {
    if (taskStatuses.length <= 1) {
      message.warning('至少保留一个状态');
      return;
    }
    setTaskStatuses(taskStatuses.filter((s) => s.id !== id));
    message.success('状态已删除');
  }

  async function handleSaveProjectStatus() {
    const values = await projectStatusForm.validateFields();
    if (editingProjectStatus) {
      setProjectStatuses(projectStatuses.map((s) => s.id === editingProjectStatus.id ? values : s));
    } else {
      setProjectStatuses([...projectStatuses, values]);
    }
    setProjectStatusModalOpen(false);
    projectStatusForm.resetFields();
    setEditingProjectStatus(null);
    message.success('项目状态已保存');
  }

  async function handleDeleteProjectStatus(id: string) {
    if (projectStatuses.length <= 1) {
      message.warning('至少保留一个项目状态');
      return;
    }
    setProjectStatuses(projectStatuses.filter((s) => s.id !== id));
    message.success('项目状态已删除');
  }

  function openEditPriority(priority?: PriorityOption) {
    if (priority) {
      setEditingPriority(priority);
      priorityForm.setFieldsValue(priority);
      setPriorityColor(priority.color || '');
    } else {
      setEditingPriority(null);
      priorityForm.resetFields();
      setPriorityColor('#1677ff');
    }
    setPriorityModalOpen(true);
  }

  function openEditStatus(status?: StatusOption) {
    if (status) {
      setEditingStatus(status);
      statusForm.setFieldsValue(status);
      setStatusColor(status.color || '');
    } else {
      setEditingStatus(null);
      statusForm.resetFields();
      setStatusColor('#1677ff');
    }
    setStatusModalOpen(true);
  }

  function openEditProjectStatus(status?: StatusOption) {
    if (status) {
      setEditingProjectStatus(status);
      projectStatusForm.setFieldsValue(status);
      setProjectStatusColor(status.color || '');
    } else {
      setEditingProjectStatus(null);
      projectStatusForm.resetFields();
      setProjectStatusColor('#1677ff');
    }
    setProjectStatusModalOpen(true);
  }

  const ColorPicker = ({ color, setColor, form }: { color: string; setColor: (c: string) => void; form: any }) => (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        {COLOR_OPTIONS.map((c) => (
          <span
            key={c}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: c,
              cursor: 'pointer',
              border: color === c ? '3px solid #1677ff' : '2px solid transparent',
              boxShadow: color === c ? '0 0 0 3px rgba(22, 119, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s',
              transform: color === c ? 'scale(1.1)' : 'scale(1)',
            }}
            onClick={() => {
              setColor(c);
              form.setFieldsValue({ color: c });
            }}
          >
            {color === c && <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
          </span>
        ))}
        <div
          style={{
            position: 'relative',
            width: 28,
            height: 28,
            borderRadius: '50%',
            cursor: 'pointer',
          }}
          title="自定义颜色"
        >
          <Input
            type="color"
            value={color || '#1677ff'}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px dashed #999',
              cursor: 'pointer',
              opacity: 1,
              padding: 0,
              appearance: 'none',
            }}
            onChange={(e) => {
              const c = e.target.value;
              setColor(c);
              form.setFieldsValue({ color: c });
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: 14,
              pointerEvents: 'none',
            }}
          >+</span>
        </div>
      </div>
    </div>
  );

  const StatusTable = ({ data, onEdit, onDelete }: { data: StatusOption[]; onEdit: (s?: StatusOption) => void; onDelete: (id: string) => void }) => (
    <Table
      dataSource={data}
      columns={[
        { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
        { title: '标签', dataIndex: 'label', key: 'label', width: 80 },
        {
          title: '颜色',
          key: 'color',
          width: 100,
          render: (_: unknown, record: StatusOption) => (
            <Space>
              <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '4px', backgroundColor: record.color }} />
              <span style={{ fontSize: 12 }}>{record.color}</span>
            </Space>
          ),
        },
        {
          title: '操作',
          key: 'actions',
          width: 120,
          render: (_: unknown, record: StatusOption) => (
            <Space>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
              <Popconfirm title="确定删除？" onConfirm={() => onDelete(record.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        },
      ]}
      rowKey="id"
      size="small"
      pagination={false}
    />
  );

  return (
    <div>
      <h2>设置</h2>
      <Button type="primary" size="small" onClick={handleSave} style={{ marginBottom: 16 }}>保存配置</Button>
      
      <Collapse defaultActiveKey={[]} style={{ maxWidth: 720 }}>
        <Collapse.Panel header="统计周期" key="period">
          <Card>
            <Form form={form} layout="vertical">
              <Form.Item name="monthStartDay" label="月起始日" rules={[{ required: true }]}>
                <InputNumber min={1} max={31} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="monthEndDay" label="月结束日" rules={[{ required: true }]}>
                <InputNumber min={1} max={31} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="weekStartDay" label="周起始日" rules={[{ required: true }]}>
                <Select
                  style={{ width: '100%' }}
                  options={[
                    { value: 0, label: '周日' },
                    { value: 1, label: '周一' },
                    { value: 2, label: '周二' },
                    { value: 3, label: '周三' },
                    { value: 4, label: '周四' },
                    { value: 5, label: '周五' },
                    { value: 6, label: '周六' },
                  ]}
                />
              </Form.Item>
            </Form>
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="优先级管理" key="priority">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditPriority()}>添加优先级</Button>
            </Space>
            <StatusTable data={priorities} onEdit={openEditPriority} onDelete={handleDeletePriority} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="任务状态管理" key="taskStatus">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditStatus()}>添加状态</Button>
            </Space>
            <StatusTable data={taskStatuses} onEdit={openEditStatus} onDelete={handleDeleteStatus} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="项目状态管理" key="projectStatus">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditProjectStatus()}>添加项目状态</Button>
            </Space>
            <StatusTable data={projectStatuses} onEdit={openEditProjectStatus} onDelete={handleDeleteProjectStatus} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="数据管理" key="data">
          <Card>
            <Space direction="vertical">
              <Button icon={<DownloadOutlined />} onClick={handleBackup}>导出备份</Button>
              <Button icon={<UploadOutlined />} onClick={() => document.getElementById('backup-file')?.click()}>导入备份</Button>
              <input
                id="backup-file"
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
        </Collapse.Panel>
      </Collapse>

      <Modal title={editingPriority ? '编辑优先级' : '新建优先级'} open={priorityModalOpen} onOk={handleSavePriority} onCancel={() => {
        setPriorityModalOpen(false);
        setEditingPriority(null);
      }}>
        <Form form={priorityForm} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker color={priorityColor} setColor={setPriorityColor} form={priorityForm} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingStatus ? '编辑状态' : '新建状态'} open={statusModalOpen} onOk={handleSaveStatus} onCancel={() => {
        setStatusModalOpen(false);
        setEditingStatus(null);
      }}>
        <Form form={statusForm} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker color={statusColor} setColor={setStatusColor} form={statusForm} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingProjectStatus ? '编辑项目状态' : '新建项目状态'} open={projectStatusModalOpen} onOk={handleSaveProjectStatus} onCancel={() => {
        setProjectStatusModalOpen(false);
        setEditingProjectStatus(null);
      }}>
        <Form form={projectStatusForm} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker color={projectStatusColor} setColor={setProjectStatusColor} form={projectStatusForm} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
