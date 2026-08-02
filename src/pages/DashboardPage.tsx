import React, { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Dropdown, Form, Input, InputNumber, Menu, Modal, Popconfirm, Select, Table, Tag, Space, message } from 'antd';
import { PlusOutlined, DownOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { LeaveService } from '../services/LeaveService';
import type { Leave, Task } from '../types';
import { useConfig } from '../contexts/ConfigContext';

interface ResizableTitleProps {
  onResize?: (width: number) => void;
  width?: number;
  [key: string]: unknown;
}

function ResizableTitle(props: ResizableTitleProps) {
  const { onResize, width, style, ...restProps } = props;
  if (!width || !onResize) return <th {...restProps} style={style as React.CSSProperties} />;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      onResize(Math.max(60, startWidth + ev.clientX - startX));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <th {...restProps} style={{ ...(style as React.CSSProperties), position: 'relative' }}>
      {restProps.children as React.ReactNode}
      <span
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 2,
          userSelect: 'none',
        }}
      />
    </th>
  );
}

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('not_done');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [taskForm] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [taskSortInfo, setTaskSortInfo] = useState<SorterResult<Task>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const { priorities, taskStatuses, leaveTypes } = useConfig();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, dateRange, statusFilter]);

  async function loadData() {
    await ProjectService.resetCache();
    await TaskService.resetCache();
    await LeaveService.resetCache();
    const [ts, ps, ls] = await Promise.all([TaskService.getTasks(), ProjectService.getProjects(), LeaveService.getLeaves()]);
    setTasks(ts);
    setProjects(ps.map((p) => ({ id: p.id, name: p.name })));
    setProjectNames(new Map(ps.map((p) => [p.id, p.name])));
    setLeaves(ls);
  }

  function applyFilters() {
    let result = [...tasks];

    if (statusFilter === 'not_done') {
      result = result.filter((t) => t.status !== 'done');
    } else if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day').valueOf();
      const end = dateRange[1].endOf('day').valueOf();
      result = result.filter((t) => {
        const startTime = t.startTime ? dayjs(t.startTime).valueOf() : null;
        const finishTime = t.finishTime ? dayjs(t.finishTime).valueOf() : null;
        if (!startTime && !finishTime) return false;
        if (startTime && startTime >= start && startTime <= end) return true;
        if (finishTime && finishTime >= start && finishTime <= end) return true;
        return false;
      });
    }

    setFilteredTasks(result);
    setTotalHours(result.reduce((sum, t) => sum + t.workHours, 0));
  }

  async function handleAddTask() {
    setEditingTask(null);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      date: dayjs(),
      projectId: projects[0]?.id,
      priority: priorities[0]?.id,
      status: taskStatuses.find((s) => s.id === 'todo')?.id || taskStatuses[0]?.id,
      workHours: 0,
    });
    setTaskModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    taskForm.setFieldsValue({
      title: task.title,
      projectId: task.projectId,
      description: task.description,
      priority: task.priority,
      status: task.status,
      workHours: task.workHours,
      startTime: task.startTime ? dayjs(task.startTime) : null,
      finishTime: task.finishTime ? dayjs(task.finishTime) : null,
      remark: task.remark,
    });
    setTaskModalOpen(true);
  }

  async function handleSaveTask() {
    const values = await taskForm.validateFields();
    if (editingTask) {
      await TaskService.updateTask(editingTask.id, {
        title: values.title,
        projectId: values.projectId,
        description: values.description || '',
        priority: values.priority,
        status: values.status,
        workHours: typeof values.workHours === 'number' ? values.workHours : 0,
        startTime: values.startTime ? values.startTime.toISOString() : null,
        finishTime: values.finishTime ? values.finishTime.toISOString() : null,
        remark: values.remark || '',
      });
      message.success('任务已保存');
    } else {
      const added = await TaskService.addTask(values.projectId, values.title);
      await TaskService.updateTask(added.id, {
        description: values.description || '',
        priority: values.priority,
        status: values.status,
        startTime: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        finishTime: null,
        workHours: typeof values.workHours === 'number' ? values.workHours : 0,
        remark: values.remark || '',
      });
      message.success('任务已添加');
    }
    setTaskModalOpen(false);
    setEditingTask(null);
    loadData();
  }

  async function handleAddLeave() {
    setEditingLeaveId(null);
    leaveForm.resetFields();
    leaveForm.setFieldsValue({
      date: dayjs(),
      type: leaveTypes[0]?.id,
      hours: 8,
    });
    setLeaveModalOpen(true);
  }

  function openEditLeave(leave: Leave) {
    setEditingLeaveId(leave.id);
    leaveForm.setFieldsValue({
      date: dayjs(leave.date),
      type: leave.type,
      hours: leave.hours,
      remark: leave.remark,
    });
    setLeaveModalOpen(true);
  }

  async function handleSaveLeave() {
    const values = await leaveForm.validateFields();
    const data = {
      date: values.date.format('YYYY-MM-DD'),
      type: values.type,
      hours: values.hours,
      remark: values.remark || '',
    };
    if (editingLeaveId) {
      await LeaveService.updateLeave(editingLeaveId, data);
      message.success('请假已保存');
    } else {
      await LeaveService.addLeave(data);
      message.success('请假已添加');
    }
    setLeaveModalOpen(false);
    setEditingLeaveId(null);
    loadData();
  }

  async function handleDeleteLeave(id: string) {
    await LeaveService.deleteLeave(id);
    message.success('请假已删除');
    loadData();
  }

  const getLeaveTypeName = (typeId: string) => {
    return leaveTypes.find((t) => t.id === typeId)?.label || typeId;
  };

  const getLeaveTypeColor = (typeId: string) => {
    return leaveTypes.find((t) => t.id === typeId)?.color || '#d9d9d9';
  };

  const priorityOrder: Record<string, number> = priorities.reduce((acc, p, index) => {
    acc[p.id] = index;
    return acc;
  }, {} as Record<string, number>);

  const taskColumns = [
    {
      title: '项目',
      key: 'project',
      width: 140,
      ellipsis: true,
      sorter: true,
      render: (_: unknown, record: Task) => projectNames.get(record.projectId) ?? '-',
    },
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Task) => (
        <Tooltip
          title={
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <div><strong>标题：</strong>{title}</div>
              <div><strong>项目：</strong>{projectNames.get(record.projectId) ?? '-'}</div>
              <div><strong>描述：</strong>{record.description || '无'}</div>
              <div><strong>优先级：</strong>{priorities.find((p) => p.id === record.priority)?.label || record.priority}</div>
              <div><strong>状态：</strong>{taskStatuses.find((s) => s.id === record.status)?.label || record.status}</div>
              <div><strong>工时：</strong>{record.workHours}h</div>
              <div><strong>开始时间：</strong>{record.startTime ? dayjs(record.startTime).format('YYYY-MM-DD HH:mm') : '无'}</div>
              <div><strong>完成时间：</strong>{record.finishTime ? dayjs(record.finishTime).format('YYYY-MM-DD HH:mm') : '无'}</div>
              <div><strong>备注：</strong>{record.remark || '无'}</div>
            </div>
          }
        >
          <span style={{ cursor: 'pointer' }}>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 96,
      sorter: true,
      render: (p: string, record: Task) => {
        const priority = priorities.find((pr) => pr.id === p);
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
              loadData();
            }}
          />
        );
        return (
          <Dropdown overlay={menu} placement="bottomLeft">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: '#666' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: priority?.color || '#999', marginRight: 6 }} />
                {priority?.label || p}
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
      width: 100,
      sorter: true,
      render: (s: string, record: Task) => {
        const status = taskStatuses.find((st) => st.id === s);
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
              const updates: Partial<Task> = { status: key };
              if (key === 'done' && !record.finishTime) {
                updates.finishTime = dayjs().format('YYYY-MM-DD');
              }
              await TaskService.updateTask(record.id, updates);
              loadData();
            }}
          />
        );
        return (
          <Dropdown overlay={menu} placement="bottomLeft">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', color: '#666' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: status?.color || '#999', marginRight: 6 }} />
                {status?.label || s}
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
      width: 84,
      sorter: true,
      render: (h: number, record: Task) => (
        <InputNumber
          min={0}
          max={24}
          step={0.5}
          value={h}
          onChange={async (value) => {
            if (value !== undefined && value !== null) {
              await TaskService.updateTask(record.id, { workHours: value });
              loadData();
            }
          }}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 110,
      sorter: true,
      render: (t: string | null) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      key: 'finishTime',
      width: 110,
      sorter: true,
      render: (t: string | null) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 88,
      render: (_: unknown, record: Task) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditTask(record)} />
          <Popconfirm title="确定删除该任务？" onConfirm={async () => {
            await TaskService.deleteTask(record.id);
            loadData();
            message.success('任务已删除');
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const { columnKey, order } = taskSortInfo;
    if (!columnKey || !order) return 0;
    const direction = order === 'ascend' ? 1 : -1;
    if (columnKey === 'project') {
      const nameA = projectNames.get(a.projectId) ?? '';
      const nameB = projectNames.get(b.projectId) ?? '';
      return nameA.localeCompare(nameB, 'zh-CN') * direction;
    }
    if (columnKey === 'priority') {
      return ((priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)) * direction;
    }
    if (columnKey === 'status') {
      const labelA = taskStatuses.find((s) => s.id === a.status)?.label || a.status;
      const labelB = taskStatuses.find((s) => s.id === b.status)?.label || b.status;
      return labelA.localeCompare(labelB, 'zh-CN') * direction;
    }
    const va = a[columnKey as keyof Task];
    const vb = b[columnKey as keyof Task];
    if (va === vb) return 0;
    if (va === null || va === undefined) return direction;
    if (vb === null || vb === undefined) return -direction;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * direction;
    return String(va).localeCompare(String(vb)) * direction;
  });

  const RESIZABLE_KEYS = ['project'];
  const resizableTaskColumns = taskColumns.map((col) => {
    const key = col.key as string;
    if (!RESIZABLE_KEYS.includes(key)) {
      return col;
    }
    const w = columnWidths[key] ?? col.width ?? 100;
    return {
      ...col,
      width: w,
      onHeaderCell: () => ({
        width: w,
        onResize: (newWidth: number) => setColumnWidths((prev) => ({ ...prev, [key]: newWidth })),
      }),
    };
  });

  const leaveColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getLeaveTypeColor(type)}>{getLeaveTypeName(type)}</Tag>
      ),
    },
    {
      title: '工时',
      dataIndex: 'hours',
      key: 'hours',
      width: 80,
      render: (hours: number) => <span style={{ color: hours !== 8 ? '#f5222d' : undefined }}>{hours}小时</span>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Leave) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditLeave(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDeleteLeave(record.id)} okText="确定" cancelText="取消">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1e293b' }}>任务概览</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>实时查看所有任务状态和工时统计</p>
        </div>
      </div>

      <Card
        title="任务概览合计"
        style={{ marginBottom: 20 }}
        size="small"
        styles={{ body: { padding: 16, paddingTop: 12, paddingBottom: 12 } }}
      >
        <Space size="large" wrap>
          <span style={{ color: '#64748b' }}>
            任务总数：<strong style={{ color: '#1e293b', fontSize: 18 }}>{filteredTasks.length}</strong> 个
          </span>
          <span style={{ color: '#64748b' }}>
            总工时：<strong style={{ color: '#2563eb', fontSize: 18 }}>{totalHours}h</strong>
          </span>
          <span style={{ color: '#64748b' }}>
            已完成：<strong style={{ color: '#059669', fontSize: 18 }}>{filteredTasks.filter((t) => t.status === 'done').length}</strong> 个
          </span>
          <span style={{ color: '#64748b' }}>
            进行中：<strong style={{ color: '#d97706', fontSize: 18 }}>{filteredTasks.filter((t) => t.status === 'in_progress').length}</strong> 个
          </span>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            style={{ width: 320 }}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'not_done', label: '未完成' },
              ...taskStatuses.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
          <button
            onClick={() => {
              setDateRange(null);
              setStatusFilter('not_done');
              message.success('已重置筛选条件');
            }}
            style={{ padding: '4px 16px', border: '1px solid #d9d9d9', borderRadius: 8, cursor: 'pointer', background: '#fff' }}
          >
            重置
          </button>
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTask}>新增任务</Button>
        <Button icon={<PlusOutlined />} onClick={handleAddLeave}>新增请假</Button>
      </div>

      <Card title="任务列表" style={{ background: '#fff', marginBottom: 16 }}>
        <Table
          dataSource={sortedTasks}
          columns={resizableTaskColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
          onChange={(_, __, sorter) => setTaskSortInfo(sorter as SorterResult<Task>)}
          components={{ header: { cell: ResizableTitle } }}
          tableLayout="fixed"
          style={{ background: '#fff' }}
        />
      </Card>

      <Card title="请假记录" style={{ background: '#fff' }}>
        <Table
          dataSource={leaves}
          columns={leaveColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          style={{ background: '#fff' }}
        />
      </Card>

      <Modal title={editingTask ? '编辑任务' : '新增任务'} open={taskModalOpen} onOk={handleSaveTask} onCancel={() => { setTaskModalOpen(false); setEditingTask(null); }} width={560}>
        <Form form={taskForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入任务标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: '请选择项目' }]}>
            <Select
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              options={[...projects].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
              <Select style={{ width: 100 }} options={priorities.map((p) => ({ value: p.id, label: p.label }))} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
              <Select style={{ width: 110 }} options={taskStatuses.map((s) => ({ value: s.id, label: s.label }))} />
            </Form.Item>
            <Form.Item name="workHours" label="工时">
              <InputNumber min={0} max={24} step={0.5} />
            </Form.Item>
          </Space>
          {editingTask ? (
            <Space>
              <Form.Item name="startTime" label="开始时间"><DatePicker showTime /></Form.Item>
              <Form.Item name="finishTime" label="完成时间"><DatePicker showTime /></Form.Item>
            </Space>
          ) : (
            <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingLeaveId ? '编辑请假' : '新增请假'} open={leaveModalOpen} onOk={handleSaveLeave} onCancel={() => { setLeaveModalOpen(false); setEditingLeaveId(null); }} width={480}>
        <Form form={leaveForm} layout="vertical">
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select style={{ width: '100%' }} options={leaveTypes.map((t) => ({ value: t.id, label: t.label }))} />
          </Form.Item>
          <Form.Item name="hours" label="工时" rules={[{ required: true, message: '请输入工时' }]}>
            <InputNumber min={0.5} max={16} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
