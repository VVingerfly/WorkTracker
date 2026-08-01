import { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Form, Input, Menu, Modal, Popconfirm, Select, Space, Table, Tabs, message } from 'antd';
import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ProjectService } from '../services/ProjectService';
import type { Project, ProjectGroup } from '../types';
import type { SorterResult } from 'antd/es/table/interface';
import { useConfig } from '../contexts/ConfigContext';
import { ProjectPage } from './ProjectPage';
import { ColorPicker } from './SettingsPage';

export function AdminPage() {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupForm] = Form.useForm();
  const [projectForm] = Form.useForm();
  const [groupColor, setGroupColor] = useState<string>('');
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortInfo, setSortInfo] = useState<SorterResult<Project>>({});
  const { priorities, projectStatuses } = useConfig();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    await ProjectService.resetCache();
    const [g, p] = await Promise.all([
      ProjectService.getGroups(),
      ProjectService.getProjects(),
    ]);
    setGroups(g);
    setProjects(p);
  }

  const filteredProjects = projects.filter((p) => {
    if (filterGroupId && p.groupId !== filterGroupId) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const s = Array.isArray(sortInfo) ? sortInfo[0] : sortInfo;
    if (!s || !s.field) return 0;
    const field = String(s.field);
    const direction = s.order === 'ascend' ? 1 : -1;

    if (field === 'groupId') {
      const groupA = groups.find((g) => g.id === a.groupId)?.name || '';
      const groupB = groups.find((g) => g.id === b.groupId)?.name || '';
      return groupA.localeCompare(groupB) * direction;
    }

    if (field === 'status') {
      const statusA = projectStatuses.find((s) => s.id === a.status)?.label || a.status;
      const statusB = projectStatuses.find((s) => s.id === b.status)?.label || b.status;
      return statusA.localeCompare(statusB) * direction;
    }

    if (field === 'priority') {
      const priorityA = priorities.find((p) => p.id === a.priority)?.label || a.priority;
      const priorityB = priorities.find((p) => p.id === b.priority)?.label || b.priority;
      return priorityA.localeCompare(priorityB) * direction;
    }

    const valA = a[field as keyof Project];
    const valB = b[field as keyof Project];
    if (valA === null || valA === undefined) return direction;
    if (valB === null || valB === undefined) return -direction;
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * direction;
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * direction;
    }
    return String(valA).localeCompare(String(valB)) * direction;
  });

  async function handleAddGroup() {
    const values = await groupForm.validateFields();
    if (editingGroup) {
      await ProjectService.updateGroup(editingGroup.id, values);
      message.success('分组已更新');
    } else {
      await ProjectService.addGroup(values.name, values.description ?? '', values.color);
      message.success('分组已创建');
    }
    setGroupModalOpen(false);
    groupForm.resetFields();
    setEditingGroup(null);
    await loadData();
  }

  async function handleAddProject() {
    if (!selectedGroupId) return;
    const values = await projectForm.validateFields();
    const payload = { ...values };
    if (editingProject) {
      await ProjectService.updateProject(editingProject.id, payload);
      message.success('项目已更新');
    } else {
      await ProjectService.addProject(selectedGroupId, payload);
      message.success('项目已创建');
    }
    setProjectModalOpen(false);
    projectForm.resetFields();
    setEditingProject(null);
    await loadData();
  }

  function openEditGroup(group: ProjectGroup) {
    setEditingGroup(group);
    groupForm.setFieldsValue(group);
    setGroupColor(group.color || '');
    setGroupModalOpen(true);
  }

  function openEditProject(project: Project) {
    setEditingProject(project);
    setSelectedGroupId(project.groupId);
    projectForm.setFieldsValue(project);
    setProjectModalOpen(true);
  }

  const groupColumns = [
    {
      title: '颜色',
      key: 'color',
      width: 80,
      render: (_: unknown, record: ProjectGroup) => (
        record.color ? (
          <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '50%', backgroundColor: record.color }} />
        ) : '-'
      ),
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '项目数',
      key: 'projectCount',
      width: 80,
      render: (_: unknown, record: ProjectGroup) => projects.filter((p) => p.groupId === record.id).length,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: ProjectGroup) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditGroup(record)} />
          <Popconfirm title="确定删除分组及其所有项目？" onConfirm={async () => {
            await ProjectService.deleteGroup(record.id);
            await loadData();
            message.success('分组已删除');
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const projectColumns = [
    {
      title: '所属分组',
      dataIndex: 'groupId',
      key: 'group',
      width: 120,
      sorter: true,
      render: (_: unknown, record: Project) => {
        const group = groups.find((g) => g.id === record.groupId);
        return group ? (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '4px',
              backgroundColor: group.color || '#f0f0f0',
              color: '#fff',
              fontSize: 12,
            }}
          >
            {group.name}
          </span>
        ) : '-';
      },
    },
    { title: '名称', dataIndex: 'name', key: 'name', sorter: true },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: true,
      render: (s: string, record: Project) => {
        const currentStatus = projectStatuses.find((st) => st.id === s);
        const menu = (
          <Menu
            items={projectStatuses.map((st) => ({
              key: st.id,
              label: (
                <span>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: st.color, marginRight: 8 }} />
                  {st.label}
                </span>
              ),
            }))}
            onClick={async ({ key }) => {
              await ProjectService.updateProject(record.id, { status: key });
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
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      sorter: true,
      render: (p: string, record: Project) => {
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
              await ProjectService.updateProject(record.id, { priority: key });
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
    { title: '工作室', dataIndex: 'studioName', key: 'studioName', width: 100, sorter: true },
    { title: '对接人', dataIndex: 'contactPerson', key: 'contactPerson', width: 100, sorter: true },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Project) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditProject(record)} />
          <Popconfirm title="确定删除项目及其所有任务？" onConfirm={async () => {
            await ProjectService.deleteProject(record.id);
            await loadData();
            message.success('项目已删除');
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>管理</h2>
      <Tabs defaultActiveKey="groups">
        <Tabs.TabPane tab="分组管理" key="groups">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingGroup(null);
                groupForm.resetFields();
                setGroupModalOpen(true);
              }}>新建分组</Button>
            </Space>
            <Table dataSource={groups} columns={groupColumns} rowKey="id" size="small" pagination={false} />
          </Card>
        </Tabs.TabPane>
        <Tabs.TabPane tab="项目管理" key="projects">
          <Card>
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} disabled={groups.length === 0} onClick={() => {
                if (groups.length > 0) {
                  setEditingProject(null);
                  setSelectedGroupId(groups[0].id);
                  projectForm.resetFields();
                  setProjectModalOpen(true);
                }
              }}>新建项目</Button>
              <Select
                placeholder="按分组过滤"
                style={{ width: 160 }}
                value={filterGroupId}
                onChange={(value) => setFilterGroupId(value)}
                options={[{ value: null, label: '全部' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
                allowClear
              />
              <Select
                placeholder="按状态过滤"
                style={{ width: 120 }}
                value={filterStatus}
                onChange={(value) => setFilterStatus(value)}
                options={[{ value: null, label: '全部' }, ...projectStatuses.map((s) => ({ value: s.id, label: s.label }))]}
                allowClear
              />
            </Space>
            <Table
              dataSource={sortedProjects}
              columns={projectColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              onChange={(_, __, sorter) => setSortInfo(sorter as SorterResult<Project>)}
            />
          </Card>
        </Tabs.TabPane>
        <Tabs.TabPane tab="任务管理" key="tasks">
          <ProjectPage />
        </Tabs.TabPane>
      </Tabs>

      <Modal title={editingGroup ? '编辑分组' : '新建分组'} open={groupModalOpen} onOk={handleAddGroup} onCancel={() => {
        setGroupModalOpen(false);
        setEditingGroup(null);
      }}>
        <Form form={groupForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker color={groupColor} setColor={setGroupColor} form={groupForm} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingProject ? '编辑项目' : '新建项目'} open={projectModalOpen} onOk={handleAddProject} onCancel={() => {
        setProjectModalOpen(false);
        setEditingProject(null);
      }} width={560}>
        <Form form={projectForm} layout="vertical">
          <Form.Item label="所属分组">
            <Select value={selectedGroupId} onChange={setSelectedGroupId} options={groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={projectStatuses.map((s) => ({ value: s.id, label: s.label }))} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
            <Select options={priorities.map((p) => ({ value: p.id, label: p.label }))} />
          </Form.Item>
          <Form.Item name="studioName" label="工作室名称"><Input /></Form.Item>
          <Form.Item name="contactPerson" label="对接人"><Input /></Form.Item>
          <Form.Item name="customFields" label="自定义字段">
            <Input.TextArea placeholder='[{"key":"字段名","label":"显示标签","value":"值"}]' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
