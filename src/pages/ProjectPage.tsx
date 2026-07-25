import React, { useEffect, useState } from 'react';
import { Button, DatePicker, Dropdown, Form, Input, InputNumber, Menu, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Tree, message } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, DownOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DataNode } from 'antd/es/tree';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Project, ProjectGroup, Task } from '../types';
import { ConfigService } from '../services/ConfigService';

export function ProjectPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskForm] = Form.useForm();
  const [priorities, setPriorities] = useState<{ id: string; label: string; color: string }[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortInfo, setSortInfo] = useState<{ key: string; order: 'ascend' | 'descend' }>({ key: 'startTime', order: 'descend' });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  async function loadData() {
    await ProjectService.resetCache();
    await TaskService.resetCache();
    const [g, p, t] = await Promise.all([
      ProjectService.getGroups(),
      ProjectService.getProjects(),
      TaskService.getTasks(),
    ]);
    setGroups(g);
    setProjects(p);
    setTasks(t);
  }

  async function loadConfig() {
    const [p, s, ps] = await Promise.all([ConfigService.getPriorities(), ConfigService.getTaskStatuses(), ConfigService.getProjectStatuses()]);
    setPriorities(p);
    setTaskStatuses(s);
    setProjectStatuses(ps);
  }

  const filteredProjects = statusFilter.length === 0 ? projects : projects.filter((p) => statusFilter.includes(p.status));

  const treeData: DataNode[] = groups.map((group) => ({
    key: `group-${group.id}`,
    title: (
      <span>
        {group.color && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: group.color, marginRight: 8 }} />}
        {group.name}
      </span>
    ),
    children: filteredProjects
      .filter((p) => p.groupId === group.id)
      .map((p) => ({
        key: `project-${p.id}`,
        title: (
          <span>
            {p.color && <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', backgroundColor: p.color, marginRight: 8 }} />}
            {p.name}
            <Tag color={getStatusColor(p.status)} style={{ marginLeft: 8, fontSize: 10 }}>
              {projectStatuses.find((s) => s.id === p.status)?.label || p.status}
            </Tag>
          </span>
        ),
        isLeaf: true,
      })),
  }));

  function getStatusColor(status: string): string {
    const found = projectStatuses.find((s) => s.id === status);
    return found?.color || '#999';
  }

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : [];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const key = sortInfo.key;
    const order = sortInfo.order === 'ascend' ? 1 : -1;
    const va = a[key as keyof Task];
    const vb = b[key as keyof Task];
    if (va === vb) return 0;
    if (va === null || va === undefined) return order;
    if (vb === null || vb === undefined) return -order;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * order;
    return String(va).localeCompare(String(vb)) * order;
  });

  function onTreeSelect(keys: React.Key[]) {
    const key = keys[0]?.toString() ?? '';
    if (key.startsWith('project-')) {
      setSelectedProjectId(key.replace('project-', ''));
    }
  }

  async function handleSaveTask() {
    const values = await taskForm.validateFields();
    const payload = {
      ...values,
      startTime: values.startTime ? values.startTime.toISOString() : null,
      finishTime: values.finishTime ? values.finishTime.toISOString() : null,
    };
    if (editingTask) {
      await TaskService.updateTask(editingTask.id, payload);
    } else if (selectedProjectId) {
      const task = await TaskService.addTask(selectedProjectId, values.title);
      await TaskService.updateTask(task.id, payload);
    }
    setTaskModalOpen(false);
    taskForm.resetFields();
    setEditingTask(null);
    await loadData();
    message.success('任务已保存');
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    taskForm.setFieldsValue({
      ...task,
      startTime: task.startTime ? dayjs(task.startTime) : null,
      finishTime: task.finishTime ? dayjs(task.finishTime) : null,
    });
    setTaskModalOpen(true);
  }

  function openViewTask(task: Task) {
    setViewingTask(task);
    setTaskDetailModalOpen(true);
  }

  const taskColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openViewTask(record)} />
          <Tooltip title={record.description || '无描述'}>
            <span>{title}</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 120,
      sorter: true,
      defaultSortOrder: 'descend' as const,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      sorter: true,
      render: (p: string, record: Task) => {
        const currentPriority = priorities.find((pr) => pr.id === p);
        const menu = (
          <Menu
            items={priorities.map((pr) => ({
              key: pr.id,
              label: (
                <span>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: pr.color, marginRight: 8 }} />
                  {pr.label}
                </span>
              ),
            }))}
            onClick={async ({ key }) => {
              await TaskService.updateTask(record.id, { priority: key });
              await loadData();
            }}
          />
        );
        return (
          <Dropdown overlay={menu} placement="bottomLeft">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: '#666' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: currentPriority?.color || '#999', marginRight: 6 }} />
                {currentPriority?.label || p}
              </span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </span>
          </Dropdown>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: true,
      render: (s: string, record: Task) => {
        const currentStatus = taskStatuses.find((st) => st.id === s);
        const menu = (
          <Menu
            items={taskStatuses.map((st) => ({
              key: st.id,
              label: (
                <span>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: st.color, marginRight: 8 }} />
                  {st.label}
                </span>
              ),
            }))}
            onClick={async ({ key }) => {
              await TaskService.updateTask(record.id, { status: key });
              await loadData();
            }}
          />
        );
        return (
          <Dropdown overlay={menu} placement="bottomLeft">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: '#666' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: currentStatus?.color || '#999', marginRight: 6 }} />
                {currentStatus?.label || s}
              </span>
              <DownOutlined style={{ fontSize: 12, color: '#999' }} />
            </span>
          </Dropdown>
        );
      },
    },
    {
      title: '工时',
      dataIndex: 'workHours',
      key: 'workHours',
      width: 80,
      sorter: true,
      render: (h: number, record: Task) => (
        <InputNumber
          value={h}
          onChange={async (value) => {
            await TaskService.updateTask(record.id, { workHours: value || 0 });
            await loadData();
          }}
          min={0}
          step={0.5}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: Task) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditTask(record)} />
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await TaskService.deleteTask(record.id);
            await loadData();
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 96px)' }}>
      <div
        style={{
          width: collapsed ? 48 : 300,
          borderRight: collapsed ? 'none' : '1px solid #f0f0f0',
          overflow: 'hidden',
          transition: 'width 0.3s ease, border 0.3s ease',
          position: 'relative',
          flexShrink: 0,
          paddingLeft: collapsed ? 4 : 16,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {!collapsed && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select
                mode="multiple"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ flex: 1 }}
                placeholder="选择项目状态"
                options={projectStatuses.map((s) => ({ value: s.id, label: s.label }))}
              />
              <Button
                type="text"
                icon={<MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  borderRadius: '4px',
                  padding: 6,
                }}
              />
            </div>
            <Tree treeData={treeData} onSelect={onTreeSelect} defaultExpandAll />
          </>
        )}
        {collapsed && (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '4px',
              padding: 8,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1 }}>
        {selectedProjectId ? (
          <>
            <Space style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{projects.find((p) => p.id === selectedProjectId)?.name}</h3>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
                setEditingTask(null);
                taskForm.resetFields();
                setTaskModalOpen(true);
              }}>新建任务</Button>
            </Space>
            <Table
              dataSource={sortedTasks}
              columns={taskColumns}
              rowKey="id"
              size="small"
              pagination={false}
              onChange={(_, __, sorter) => {
                const s = Array.isArray(sorter) ? sorter[0] : sorter;
                if (s?.field && s?.order) {
                  setSortInfo({ key: String(s.field), order: s.order });
                }
              }}
            />
          </>
        ) : (
          <div style={{ color: '#999', paddingTop: 40, textAlign: 'center' }}>请从左侧选择一个项目</div>
        )}
      </div>

      <Modal title={editingTask ? '编辑任务' : '新建任务'} open={taskModalOpen} onOk={handleSaveTask} onCancel={() => setTaskModalOpen(false)} width={560}>
        <Form form={taskForm} layout="vertical" initialValues={{ priority: priorities[1]?.id || 'medium', status: taskStatuses[0]?.id || 'todo', workHours: 0 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
          <Space>
            <Form.Item name="priority" label="优先级">
              <Select style={{ width: 100 }} options={priorities.map((p) => ({ value: p.id, label: p.label }))} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select style={{ width: 110 }} options={taskStatuses.map((s) => ({ value: s.id, label: s.label }))} />
            </Form.Item>
            <Form.Item name="workHours" label="工时"><InputNumber min={0} step={0.5} /></Form.Item>
          </Space>
          <Space>
            <Form.Item name="startTime" label="开始时间"><DatePicker showTime /></Form.Item>
            <Form.Item name="finishTime" label="完成时间"><DatePicker showTime /></Form.Item>
          </Space>
          <Form.Item name="remark" label="备注"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal title="任务详情" open={taskDetailModalOpen} onCancel={() => setTaskDetailModalOpen(false)} footer={null}>
        {viewingTask && (
          <div style={{ padding: 8 }}>
            <p><strong>标题：</strong>{viewingTask.title}</p>
            <p><strong>描述：</strong>{viewingTask.description || '无'}</p>
            <p><strong>优先级：</strong>{priorities.find((p) => p.id === viewingTask.priority)?.label || viewingTask.priority}</p>
            <p><strong>状态：</strong>{taskStatuses.find((s) => s.id === viewingTask.status)?.label || viewingTask.status}</p>
            <p><strong>工时：</strong>{viewingTask.workHours}h</p>
            <p><strong>开始时间：</strong>{viewingTask.startTime ? dayjs(viewingTask.startTime).format('YYYY-MM-DD HH:mm') : '无'}</p>
            <p><strong>完成时间：</strong>{viewingTask.finishTime ? dayjs(viewingTask.finishTime).format('YYYY-MM-DD HH:mm') : '无'}</p>
            <p><strong>备注：</strong>{viewingTask.remark || '无'}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
