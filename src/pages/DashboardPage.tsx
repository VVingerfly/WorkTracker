import { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Dropdown, Form, Input, InputNumber, Menu, Modal, Popconfirm, Row, Select, Statistic, Table, Tag, Space, message } from 'antd';
import { ArrowUpOutlined, CheckCircleOutlined, ClockCircleOutlined, CalendarOutlined, PlusOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { LeaveService } from '../services/LeaveService';
import type { Leave, Task } from '../types';
import { useConfig } from '../contexts/ConfigContext';

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
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [taskForm] = Form.useForm();
  const [leaveForm] = Form.useForm();
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

  async function handleSaveTask() {
    const values = await taskForm.validateFields();
    const task: Omit<Task, 'id'> = {
      projectId: values.projectId,
      title: values.title,
      description: values.description || '',
      priority: values.priority,
      status: values.status,
      startTime: values.date.format('YYYY-MM-DD'),
      finishTime: null,
      workHours: values.workHours,
      remark: values.remark || '',
    };
    await TaskService.addTask(task.projectId, task.title);
    await TaskService.updateTask((await TaskService.getTasks()).find((t) => t.title === task.title && t.projectId === task.projectId)!.id, {
      ...task,
      id: undefined!,
    });
    message.success('任务已添加');
    setTaskModalOpen(false);
    loadData();
  }

  async function handleAddLeave() {
    leaveForm.resetFields();
    leaveForm.setFieldsValue({
      date: dayjs(),
      type: leaveTypes[0]?.id,
      hours: 8,
    });
    setLeaveModalOpen(true);
  }

  async function handleSaveLeave() {
    const values = await leaveForm.validateFields();
    const leave: Omit<Leave, 'id'> = {
      date: values.date.format('YYYY-MM-DD'),
      type: values.type,
      hours: values.hours,
      remark: values.remark || '',
    };
    await LeaveService.addLeave(leave);
    message.success('请假已添加');
    setLeaveModalOpen(false);
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

  const taskColumns = [
    { title: '任务', dataIndex: 'title', key: 'title' },
    {
      title: '项目',
      key: 'project',
      render: (_: unknown, record: Task) => projectNames.get(record.projectId) ?? '-',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
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
      width: 90,
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
      width: 70,
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
      width: 130,
      render: (t: string | null) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      key: 'finishTime',
      width: 130,
      render: (t: string | null) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
  ];

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
        <Popconfirm title="确定删除？" onConfirm={() => handleDeleteLeave(record.id)} okText="确定" cancelText="取消">
          <Button type="text" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
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

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            hoverable
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>任务总数</span>}
              value={filteredTasks.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总工时</span>}
              value={totalHours}
              suffix="h"
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>已完成</span>}
              value={filteredTasks.filter((t) => t.status === 'done').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            hoverable
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff',
              border: 'none',
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>进行中</span>}
              value={filteredTasks.filter((t) => t.status === 'in_progress').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

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
          dataSource={filteredTasks}
          columns={taskColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
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

      <Modal title="新增任务" open={taskModalOpen} onOk={handleSaveTask} onCancel={() => setTaskModalOpen(false)} width={520}>
        <Form form={taskForm} layout="vertical">
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="projectId" label="所属项目" rules={[{ required: true, message: '请选择项目' }]}>
            <Select style={{ width: '100%' }} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
            <Select style={{ width: '100%' }} options={priorities.map((p) => ({ value: p.id, label: p.label }))} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select style={{ width: '100%' }} options={taskStatuses.map((s) => ({ value: s.id, label: s.label }))} />
          </Form.Item>
          <Form.Item name="workHours" label="工时">
            <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新增请假" open={leaveModalOpen} onOk={handleSaveLeave} onCancel={() => setLeaveModalOpen(false)} width={480}>
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
