import { useEffect, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Button, Card, Collapse, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message } from 'antd';
import { DownloadOutlined, UploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, FolderOutlined, HolderOutlined } from '@ant-design/icons';
import { ConfigService } from '../services/ConfigService';
import { FileService } from '../services/FileService';
import { ExportService } from '../services/ExportService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Config, PriorityOption, StatusOption } from '../types';
import { useConfig } from '../contexts/ConfigContext';

const COLOR_OPTIONS = ['#1677ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2', '#faad14', '#eb2f96'];

// 模块级 dirty 标志，供 AppLayout 在切换页面时检查
let settingsDirty = false;
export function isSettingsDirty() { return settingsDirty; }
export function clearSettingsDirty() { settingsDirty = false; }

// 共享颜色选择器组件
export function ColorPicker({ color, setColor, form }: { color: string; setColor: (c: string) => void; form: any }) {
  const isPreset = COLOR_OPTIONS.includes(color);
  const isCustom = !!color && !isPreset;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
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
      {/* 自定义颜色：隐藏原生 input，用样式化的圆展示选中颜色 */}
      <label
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          cursor: 'pointer',
          backgroundColor: isCustom ? color : '#fff',
          border: isCustom ? '3px solid #1677ff' : '2px dashed #999',
          boxShadow: isCustom ? '0 0 0 3px rgba(22, 119, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
          transform: isCustom ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.2s',
        }}
        title="自定义颜色"
      >
        {isCustom ? (
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</span>
        ) : (
          <span style={{ color: '#999', fontSize: 14 }}>+</span>
        )}
        <input
          type="color"
          value={color || '#1677ff'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
          onChange={(e) => {
            const c = e.target.value;
            setColor(c);
            form.setFieldsValue({ color: c });
          }}
        />
      </label>
    </div>
  );
}

export function SettingsPage() {
  const [form] = Form.useForm<Config>();
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<StatusOption[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<StatusOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<StatusOption[]>([]);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [projectStatusModalOpen, setProjectStatusModalOpen] = useState(false);
  const [leaveTypeModalOpen, setLeaveTypeModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<PriorityOption | null>(null);
  const [editingStatus, setEditingStatus] = useState<StatusOption | null>(null);
  const [editingProjectStatus, setEditingProjectStatus] = useState<StatusOption | null>(null);
  const [editingLeaveType, setEditingLeaveType] = useState<StatusOption | null>(null);
  const [priorityForm] = Form.useForm<PriorityOption>();
  const [statusForm] = Form.useForm<StatusOption>();
  const [projectStatusForm] = Form.useForm<StatusOption>();
  const [leaveTypeForm] = Form.useForm<StatusOption>();
  const [priorityColor, setPriorityColor] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('');
  const [projectStatusColor, setProjectStatusColor] = useState<string>('');
  const [leaveTypeColor, setLeaveTypeColor] = useState<string>('');
  const [dataDir, setDataDir] = useState<string>('');
  const [changingDir, setChangingDir] = useState(false);
  const { config, saveConfig } = useConfig();
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');

  useEffect(() => { loadConfig(); loadDataDir(); }, [config]);

  // 统一的对比函数：使用 form.getFieldValue 而非 form.getFieldsValue，
  // 因为后者只返回已挂载（注册）的 Form.Item 的值，折叠面板未展开时会导致结构不匹配
  function buildCompareString(p: PriorityOption[], ts: StatusOption[], ps: StatusOption[], lt: StatusOption[]) {
    return JSON.stringify({
      monthStartDay: form.getFieldValue('monthStartDay'),
      monthEndDay: form.getFieldValue('monthEndDay'),
      weekStartDay: form.getFieldValue('weekStartDay'),
      priorities: p,
      taskStatuses: ts,
      projectStatuses: ps,
      leaveTypes: lt,
    });
  }

  // 检查表单数据是否与已保存的快照不同
  useEffect(() => {
    if (!config) return;
    const current = buildCompareString(priorities, taskStatuses, projectStatuses, leaveTypes);
    settingsDirty = current !== savedSnapshot;
  });

  async function loadDataDir() {
    try {
      const dir = await FileService.getDataDir();
      setDataDir(dir);
    } catch {
      setDataDir('(无法获取)');
    }
  }

  async function loadConfig() {
    if (!config) return;
    form.setFieldsValue(config);
    setPriorities(config.priorities);
    setTaskStatuses(config.taskStatuses);
    setProjectStatuses(config.projectStatuses);
    setLeaveTypes(config.leaveTypes);
    const snap = buildCompareString(config.priorities, config.taskStatuses, config.projectStatuses, config.leaveTypes);
    setSavedSnapshot(snap);
    settingsDirty = false;
  }

  async function handleSave() {
    const values = await form.validateFields();
    values.priorities = priorities;
    values.taskStatuses = taskStatuses;
    values.projectStatuses = projectStatuses;
    values.leaveTypes = leaveTypes;
    await saveConfig(values);
    const snap = buildCompareString(priorities, taskStatuses, projectStatuses, leaveTypes);
    setSavedSnapshot(snap);
    settingsDirty = false;
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

  async function handleOpenDir() {
    try {
      await FileService.openDataDir();
    } catch {
      message.error('无法打开目录');
    }
  }

  async function handleChangeDir() {
    setChangingDir(true);
    try {
      const newDir = await FileService.changeDataDir();
      if (newDir) {
        setDataDir(newDir);
        await ConfigService.resetCache();
        await ProjectService.resetCache();
        await TaskService.resetCache();
        await loadConfig();
        message.success('数据目录已更改，数据已迁移');
      }
    } catch {
      message.error('更改数据目录失败');
    } finally {
      setChangingDir(false);
    }
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

  function openEditLeaveType(type?: StatusOption) {
    if (type) {
      setEditingLeaveType(type);
      leaveTypeForm.setFieldsValue(type);
      setLeaveTypeColor(type.color || '');
    } else {
      setEditingLeaveType(null);
      leaveTypeForm.resetFields();
      setLeaveTypeColor('#1677ff');
    }
    setLeaveTypeModalOpen(true);
  }

  async function handleSaveLeaveType() {
    const values = await leaveTypeForm.validateFields();
    if (editingLeaveType) {
      setLeaveTypes(leaveTypes.map((t) => t.id === editingLeaveType.id ? values : t));
    } else {
      setLeaveTypes([...leaveTypes, values]);
    }
    setLeaveTypeModalOpen(false);
    leaveTypeForm.resetFields();
    setEditingLeaveType(null);
    message.success('请假类型已保存');
  }

  async function handleDeleteLeaveType(id: string) {
    if (leaveTypes.length <= 1) {
      message.warning('至少保留一个请假类型');
      return;
    }
    setLeaveTypes(leaveTypes.filter((t) => t.id !== id));
    message.success('请假类型已删除');
  }

  const StatusTable = ({ data, onEdit, onDelete, onReorder }: {
    data: StatusOption[];
    onEdit: (s?: StatusOption) => void;
    onDelete: (id: string) => void;
    onReorder: (newData: StatusOption[]) => void;
  }) => {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => setDragIndex(index);
    const handleDragOver = (e: ReactDragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) setOverIndex(index);
    };
    const handleDrop = (index: number) => {
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }
      const newData = [...data];
      const [moved] = newData.splice(dragIndex, 1);
      newData.splice(index, 0, moved);
      onReorder(newData);
      setDragIndex(null);
      setOverIndex(null);
    };

    return (
      <Table
        dataSource={data}
        columns={[
          {
            title: '',
            key: 'sort',
            width: 40,
            render: (_: unknown, __: StatusOption, index: number) => (
              <HolderOutlined
                style={{ cursor: 'grab', color: '#999', fontSize: 14 }}
                title="拖动排序"
              />
            ),
          },
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
        onRow={(_, index) => ({
          draggable: true,
          onDragStart: () => index !== undefined && handleDragStart(index),
          onDragOver: (e) => index !== undefined && handleDragOver(e, index),
          onDrop: () => index !== undefined && handleDrop(index),
          onDragEnd: () => { setDragIndex(null); setOverIndex(null); },
          style: {
            cursor: 'grab',
            background: overIndex === index ? '#f0f7ff' : undefined,
            opacity: dragIndex === index ? 0.5 : 1,
          },
        })}
      />
    );
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>设置</h2>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16, maxWidth: 720 }}>
        <Button id="settings-save-btn" type="primary" size="small" onClick={handleSave}>保存配置</Button>
      </div>
      
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
            <StatusTable data={priorities} onEdit={openEditPriority} onDelete={handleDeletePriority} onReorder={setPriorities} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="任务状态管理" key="taskStatus">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditStatus()}>添加状态</Button>
            </Space>
            <StatusTable data={taskStatuses} onEdit={openEditStatus} onDelete={handleDeleteStatus} onReorder={setTaskStatuses} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="项目状态管理" key="projectStatus">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditProjectStatus()}>添加项目状态</Button>
            </Space>
            <StatusTable data={projectStatuses} onEdit={openEditProjectStatus} onDelete={handleDeleteProjectStatus} onReorder={setProjectStatuses} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="请假类型管理" key="leaveType">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => openEditLeaveType()}>添加请假类型</Button>
            </Space>
            <StatusTable data={leaveTypes} onEdit={openEditLeaveType} onDelete={handleDeleteLeaveType} onReorder={setLeaveTypes} />
          </Card>
        </Collapse.Panel>

        <Collapse.Panel header="数据管理" key="data">
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
                  <FolderOutlined style={{ marginRight: 6 }} />
                  数据保存目录
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    value={dataDir}
                    readOnly
                    style={{ flex: 1 }}
                    placeholder="数据保存目录"
                  />
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={handleOpenDir}
                    disabled={!dataDir || dataDir === '(浏览器模式)'}
                  >
                    打开目录
                  </Button>
                  <Button
                    icon={<FolderOutlined />}
                    onClick={handleChangeDir}
                    loading={changingDir}
                    disabled={dataDir === '(浏览器模式)'}
                  >
                    更改目录
                  </Button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
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
              </div>
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

      <Modal title={editingLeaveType ? '编辑请假类型' : '新建请假类型'} open={leaveTypeModalOpen} onOk={handleSaveLeaveType} onCancel={() => {
        setLeaveTypeModalOpen(false);
        setEditingLeaveType(null);
      }}>
        <Form form={leaveTypeForm} layout="vertical">
          <Form.Item name="id" label="ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker color={leaveTypeColor} setColor={setLeaveTypeColor} form={leaveTypeForm} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
