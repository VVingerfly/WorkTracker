import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tabs, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ProjectService } from '../services/ProjectService';
import type { Project, ProjectGroup } from '../types';
import { ConfigService } from '../services/ConfigService';
import type { SorterResult } from 'antd/es/table/interface';

const COLOR_OPTIONS = ['#1677ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2', '#faad14', '#eb2f96'];

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
  const [projectColor, setProjectColor] = useState<string>('');
  const [projectStatuses, setProjectStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortInfo, setSortInfo] = useState<SorterResult<Project>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    await ProjectService.resetCache();
    const [g, p, ps] = await Promise.all([
      ProjectService.getGroups(),
      ProjectService.getProjects(),
      ConfigService.getProjectStatuses(),
    ]);
    setGroups(g);
    setProjects(p);
    setProjectStatuses(ps);
  }

  const filteredProjects = projects.filter((p) => {
    if (filterGroupId && p.groupId !== filterGroupId) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortInfo.field) return 0;
    const field = String(sortInfo.field);
    const direction = sortInfo.order === 'ascend' ? 1 : -1;
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
    setProjectColor(project.color || '');
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
      title: '颜色',
      key: 'color',
      width: 80,
      render: (_: unknown, record: Project) => (
        record.color ? (
          <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: '50%', backgroundColor: record.color }} />
        ) : '-'
      ),
    },
    {
      title: '所属分组',
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
      width: 80,
      sorter: true,
      render: (s: string) => {
        const status = projectStatuses.find((st) => st.id === s);
        return <Tag color={status?.color || '#999'}>{status?.label || s}</Tag>;
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
      </Tabs>

      <Modal title={editingGroup ? '编辑分组' : '新建分组'} open={groupModalOpen} onOk={handleAddGroup} onCancel={() => {
        setGroupModalOpen(false);
        setEditingGroup(null);
      }}>
        <Form form={groupForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea /></Form.Item>
          <Form.Item name="color" label="颜色">
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
                      border: groupColor === c ? '3px solid #1677ff' : '2px solid transparent',
                      boxShadow: groupColor === c ? '0 0 0 3px rgba(22, 119, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      transform: groupColor === c ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onClick={() => {
                      setGroupColor(c);
                      groupForm.setFieldsValue({ color: c });
                    }}
                  >
                    {groupColor === c && <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
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
                    value={groupColor || '#1677ff'}
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
                      const color = e.target.value;
                      setGroupColor(color);
                      groupForm.setFieldsValue({ color });
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
          <Form.Item name="color" label="颜色">
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
                      border: projectColor === c ? '3px solid #1677ff' : '2px solid transparent',
                      boxShadow: projectColor === c ? '0 0 0 3px rgba(22, 119, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      transform: projectColor === c ? 'scale(1.1)' : 'scale(1)',
                    }}
                    onClick={() => {
                      setProjectColor(c);
                      projectForm.setFieldsValue({ color: c });
                    }}
                  >
                    {projectColor === c && <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
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
                    value={projectColor || '#1677ff'}
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
                      const color = e.target.value;
                      setProjectColor(color);
                      projectForm.setFieldsValue({ color });
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
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={projectStatuses.map((s) => ({ value: s.id, label: s.label }))} />
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
