import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Table, Tag, Tree, message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DataNode } from 'antd/es/tree';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Project, ProjectGroup, Task, TaskPriority, TaskStatus } from '../types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types';

export function ProjectPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupForm] = Form.useForm();
  const [projectForm] = Form.useForm();
  const [taskForm] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [g, p, t] = await Promise.all([
      ProjectService.getGroups(),
      ProjectService.getProjects(),
      TaskService.getTasks(),
    ]);
    setGroups(g);
    setProjects(p);
    setTasks(t);
  }

  const treeData: DataNode[] = useMemo(() => {
    return groups.map((group) => ({
      key: `group-${group.id}`,
      title: group.name,
      children: projects
        .filter((p) => p.groupId === group.id)
        .map((p) => ({ key: `project-${p.id}`, title: p.name, isLeaf: true })),
    }));
  }, [groups, projects]);

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : [];

  function onTreeSelect(keys: React.Key[]) {
    const key = keys[0]?.toString() ?? '';
    if (key.startsWith('project-')) {
      setSelectedProjectId(key.replace('project-', ''));
    }
  }

  async function handleAddGroup() {
    const values = await groupForm.validateFields();
    await ProjectService.addGroup(values.name, values.description ?? '');
    setGroupModalOpen(false);
    groupForm.resetFields();
    await loadData();
    message.success('分组已创建');
  }

  async function handleAddProject() {
    if (!selectedGroupId) return;
    const values = await projectForm.validateFields();
    await ProjectService.addProject(selectedGroupId, values.name, values.description ?? '');
    setProjectModalOpen(false);
    projectForm.resetFields();
    await loadData();
    message.success('项目已创建');
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

  const taskColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: TaskPriority) => TASK_PRIORITY_LABELS[p],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: TaskStatus) => (
        <Tag color={s === 'done' ? 'green' : s === 'in_progress' ? 'blue' : 'default'}>
          {TASK_STATUS_LABELS[s]}
        </Tag>
      ),
    },
    { title: '工时', dataIndex: 'workHours', key: 'workHours', width: 70, render: (h: number) => `${h}h` },
    {
      title: '操作',
      key: 'actions',
      width: 120,
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
      <div style={{ width: 260, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setGroupModalOpen(true)}>分组</Button>
          <Button size="small" icon={<PlusOutlined />} disabled={groups.length === 0} onClick={() => {
            if (groups.length > 0) {
              setSelectedGroupId(groups[0].id);
              setProjectModalOpen(true);
            }
          }}>项目</Button>
        </Space>
        <Tree treeData={treeData} onSelect={onTreeSelect} defaultExpandAll />
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
            <Table dataSource={filteredTasks} columns={taskColumns} rowKey="id" size="small" pagination={false} />
          </>
        ) : (
          <div style={{ color: '#999', paddingTop: 40, textAlign: 'center' }}>请从左侧选择一个项目</div>
        )}
      </div>

      <Modal title="新建分组" open={groupModalOpen} onOk={handleAddGroup} onCancel={() => setGroupModalOpen(false)}>
        <Form form={groupForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建项目" open={projectModalOpen} onOk={handleAddProject} onCancel={() => setProjectModalOpen(false)}>
        <Form form={projectForm} layout="vertical">
          <Form.Item label="所属分组">
            <Select value={selectedGroupId} onChange={setSelectedGroupId} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingTask ? '编辑任务' : '新建任务'} open={taskModalOpen} onOk={handleSaveTask} onCancel={() => setTaskModalOpen(false)} width={560}>
        <Form form={taskForm} layout="vertical" initialValues={{ priority: 'medium', status: 'todo', workHours: 0 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
          <Space>
            <Form.Item name="priority" label="优先级">
              <Select style={{ width: 100 }} options={Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select style={{ width: 110 }} options={Object.entries(TASK_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
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
    </div>
  );
}
