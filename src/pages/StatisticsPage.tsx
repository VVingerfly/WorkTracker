import { useEffect, useState } from 'react';
import { Button, Card, Collapse, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Radio, Tabs, Tooltip, message } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined, CalendarOutlined, CoffeeOutlined, EditOutlined, ExpandAltOutlined, CompressOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatisticsService, type StatRow } from '../services/StatisticsService';
import { ExportService } from '../services/ExportService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { LeaveService } from '../services/LeaveService';
import { useConfig } from '../contexts/ConfigContext';

export function StatisticsPage({ hideTitle = false }: { hideTitle?: boolean }) {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [summary, setSummary] = useState({ totalHours: 0, taskCount: 0, doneCount: 0, leaveHours: 0 });
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [rangeText, setRangeText] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm] = Form.useForm();
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveForm] = Form.useForm();
  const [expandedDateKeys, setExpandedDateKeys] = useState<string[]>([]);
  const [expandedProjectKeys, setExpandedProjectKeys] = useState<string[]>([]);
  const { priorities, taskStatuses, leaveTypes } = useConfig();

  useEffect(() => {
    loadData(selectedDate, viewType);
    setExpandedDateKeys([]);
    setExpandedProjectKeys([]);
  }, [selectedDate, viewType]);

  async function loadData(date: dayjs.Dayjs, type: 'month' | 'week') {
    await ProjectService.resetCache();
    await TaskService.resetCache();
    await LeaveService.resetCache();
    const [range, statRows, periodSummary] = await Promise.all([
      type === 'month' ? StatisticsService.getMonthRange(date) : StatisticsService.getWeekRange(date),
      StatisticsService.getStatRows(date, type),
      StatisticsService.getMonthSummary(date, type),
    ]);
    setRows(statRows);
    setSummary(periodSummary);
    setRangeText(`${range[0].format('YYYY-MM-DD')} ~ ${range[1].format('YYYY-MM-DD')}`);
  }

  function handlePrev() {
    if (viewType === 'month') {
      setSelectedDate(selectedDate.subtract(1, 'month'));
    } else {
      setSelectedDate(selectedDate.subtract(7, 'day'));
    }
  }

  function handleNext() {
    if (viewType === 'month') {
      setSelectedDate(selectedDate.add(1, 'month'));
    } else {
      setSelectedDate(selectedDate.add(7, 'day'));
    }
  }

  async function handleUpdateTask(id: string, updates: Partial<{ workHours: number; finishTime: string | null }>) {
    await TaskService.updateTask(id, updates);
    await loadData(selectedDate, viewType);
  }

  function openEditTask(row: StatRow) {
    const taskId = row.key.replace('task:', '');
    setEditingTaskId(taskId);
    taskForm.setFieldsValue({
      title: row.taskTitle,
      description: row.description,
      priority: row.priority,
      status: row.status,
      workHours: row.workHours,
      startTime: row.startTime ? dayjs(row.startTime) : null,
      finishTime: row.finishTime ? dayjs(row.finishTime) : null,
      remark: row.remark,
    });
    setTaskModalOpen(true);
  }

  async function handleSaveTask() {
    if (!editingTaskId) return;
    const values = await taskForm.validateFields();
    await TaskService.updateTask(editingTaskId, {
      title: values.title,
      description: values.description ?? '',
      priority: values.priority,
      status: values.status,
      workHours: typeof values.workHours === 'number' ? values.workHours : 0,
      startTime: values.startTime ? values.startTime.toISOString() : null,
      finishTime: values.finishTime ? values.finishTime.toISOString() : null,
      remark: values.remark ?? '',
    });
    setTaskModalOpen(false);
    taskForm.resetFields();
    setEditingTaskId(null);
    await loadData(selectedDate, viewType);
    message.success('任务已保存');
  }

  async function handleUpdateLeave(id: string, updates: Partial<{ hours: number; date: string }>) {
    const payload: { hours?: number; date?: string } = {};
    if (typeof updates.hours === 'number') payload.hours = updates.hours;
    if (updates.date) payload.date = updates.date;
    if (Object.keys(payload).length === 0) return;
    await LeaveService.updateLeave(id, payload);
    await loadData(selectedDate, viewType);
  }

  function openEditLeave(row: StatRow) {
    if (!row.leaveId) return;
    setEditingLeaveId(row.leaveId);
    leaveForm.setFieldsValue({
      type: row.leaveType,
      hours: row.workHours,
      date: row.date ? dayjs(row.date) : null,
      remark: row.remark,
    });
    setLeaveModalOpen(true);
  }

  async function handleSaveLeave() {
    if (!editingLeaveId) return;
    const values = await leaveForm.validateFields();
    await LeaveService.updateLeave(editingLeaveId, {
      type: values.type,
      hours: typeof values.hours === 'number' ? values.hours : 0,
      date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      remark: values.remark ?? '',
    });
    setLeaveModalOpen(false);
    leaveForm.resetFields();
    setEditingLeaveId(null);
    await loadData(selectedDate, viewType);
    message.success('请假已保存');
  }

  const totalHoursAll = rows.reduce((sum, r) => sum + r.workHours, 0);
  const totalLeaveHours = rows.filter((r) => r.rowType === 'leave').reduce((sum, r) => sum + r.workHours, 0);
  const denominator = totalHoursAll + totalLeaveHours;

  const projectSummary = rows.reduce((acc, row) => {
    const existing = acc.find((p) => p.projectName === row.projectName);
    if (existing) {
      existing.taskCount += row.rowType === 'task' ? 1 : 0;
      existing.totalHours += row.workHours;
      // 对接人以任务行中的非空 contactPerson 优先填充
      if (!existing.contactPerson && row.contactPerson) {
        existing.contactPerson = row.contactPerson;
      }
    } else {
      acc.push({
        projectName: row.projectName,
        contactPerson: row.contactPerson || '',
        taskCount: row.rowType === 'task' ? 1 : 0,
        totalHours: row.workHours,
      });
    }
    return acc;
  }, [] as { projectName: string; contactPerson: string; taskCount: number; totalHours: number }[]);

  const dateSummary = rows.reduce((acc, row) => {
    const existing = acc.find((d) => d.date === row.date);
    if (existing) {
      existing.taskCount += row.rowType === 'task' ? 1 : 0;
      existing.totalHours += row.workHours;
      existing.rowCount += 1;
      existing.leaveHours += row.rowType === 'leave' ? row.workHours : 0;
    } else {
      acc.push({
        date: row.date,
        taskCount: row.rowType === 'task' ? 1 : 0,
        totalHours: row.workHours,
        rowCount: 1,
        leaveHours: row.rowType === 'leave' ? row.workHours : 0,
      });
    }
    return acc;
  }, [] as { date: string; taskCount: number; totalHours: number; rowCount: number; leaveHours: number }[]);

  const commonTaskColumns = [
    {
      title: '任务',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
      align: 'left' as const,
      render: (title: string, record: StatRow) => {
        if (record.rowType === 'leave') {
          const lt = leaveTypes.find((t) => t.id === record.leaveType);
          return (
            <Space size={4}>
              <Tag color={lt?.color || '#d9d9d9'} style={{ margin: 0 }}>
                <CoffeeOutlined style={{ marginRight: 4 }} />
                {lt?.label || '请假'}
              </Tag>
              {record.remark && <span style={{ color: '#64748b' }}>{record.remark}</span>}
            </Space>
          );
        }
        return (
          <Space size={6} style={{ width: '100%' }}>
            <Tooltip title={record.description || '无描述'}>
              <span style={{ color: '#1e293b' }}>{title}</span>
            </Tooltip>
            {record.remark && (
              <Tooltip title={`备注：${record.remark}`}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>···</span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 72,
      render: (p: string, record: StatRow) => {
        if (record.rowType === 'leave') return null;
        const priority = priorities.find((pr) => pr.id === p);
        return priority ? <Tag color={priority.color}>{priority.label}</Tag> : null;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 82,
      render: (s: string, record: StatRow) => {
        if (record.rowType === 'leave') return null;
        const status = taskStatuses.find((st) => st.id === s);
        return status ? <Tag color={status.color}>{status.label}</Tag> : null;
      },
    },
    {
      title: '工时',
      dataIndex: 'workHours',
      key: 'workHours',
      width: 90,
      render: (h: number, record: StatRow) => (
        <InputNumber
          value={h}
          onChange={async (value) => {
            if (record.rowType === 'leave' && record.leaveId) {
              await handleUpdateLeave(record.leaveId, { hours: value || 0 });
            } else {
              const taskId = record.key.replace('task:', '');
              await handleUpdateTask(taskId, { workHours: value || 0 });
            }
          }}
          min={0}
          step={0.5}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      key: 'finishTime',
      width: 140,
      render: (ft: string | null, record: StatRow) => {
        if (record.rowType === 'leave') {
          return (
            <DatePicker
              value={ft ? dayjs(ft) : null}
              onChange={async (value) => {
                if (record.leaveId) {
                  await handleUpdateLeave(record.leaveId, { date: value ? value.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD') });
                }
              }}
              allowClear={false}
              size="small"
              style={{ width: '100%' }}
            />
          );
        }
        const taskId = record.key.replace('task:', '');
        return (
          <DatePicker
            value={ft ? dayjs(ft) : null}
            onChange={async (value) => {
              await handleUpdateTask(taskId, { finishTime: value ? value.toISOString() : null });
            }}
            allowClear
            size="small"
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, record: StatRow) => (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => (record.rowType === 'leave' ? openEditLeave(record) : openEditTask(record))}
        />
      ),
    },
  ];

  // 按日期查看：首列为「项目」
  const dateViewColumns = [
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 140,
      render: (name: string, record: StatRow) => {
        if (record.rowType === 'leave') {
          return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{name}</span>;
        }
        return <span style={{ color: '#475569', fontWeight: 500 }}>{name}</span>;
      },
    },
    ...commonTaskColumns,
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 页面标题 */}
      {!hideTitle && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#0f172a' }}>工时统计</h2>
            <p style={{ color: '#64748b', marginTop: 6, marginBottom: 0, fontSize: 13 }}>
              按周期查看和编辑任务工时、完成时间、备注等内容
            </p>
          </div>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => ExportService.exportToExcel(selectedDate)}>
            导出 Excel
          </Button>
        </div>
      )}

      {/* 周期筛选条 */}
      <Card
        size="small"
        style={{ marginBottom: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <Space size={10} wrap align="center">
          <Radio.Group
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="month">月视图</Radio.Button>
            <Radio.Button value="week">周视图</Radio.Button>
          </Radio.Group>
          <Button icon={<LeftOutlined />} onClick={handlePrev}>
            {viewType === 'month' ? '上月' : '上周'}
          </Button>
          {viewType === 'month' ? (
            <DatePicker picker="month" value={selectedDate} onChange={(d) => d && setSelectedDate(d)} />
          ) : (
            <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)} />
          )}
          <Button icon={<RightOutlined />} onClick={handleNext}>
            {viewType === 'month' ? '下月' : '下周'}
          </Button>
          <div style={{ marginLeft: 4, color: '#64748b', fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 6, color: '#94a3b8' }} />
            {rangeText}
          </div>
        </Space>
      </Card>

      <Card
        title="周期合计"
        style={{ marginBottom: 20 }}
        size="small"
        styles={{ body: { padding: 16, paddingTop: 12, paddingBottom: 12 } }}
      >
        <Space size="large" wrap>
          <span style={{ color: '#64748b' }}>
            任务数：<strong style={{ color: '#1e293b', fontSize: 18 }}>{summary.taskCount}</strong> 个
          </span>
          <span style={{ color: '#64748b' }}>
            已完成：<strong style={{ color: '#059669', fontSize: 18 }}>{summary.doneCount}</strong> 个
          </span>
          <span style={{ color: '#64748b' }}>
            工时合计：<strong style={{ color: '#2563eb', fontSize: 18 }}>{summary.totalHours}h</strong>
            <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 4 }}>（{(summary.totalHours / 8).toFixed(2)} 人天）</span>
          </span>
          {summary.leaveHours > 0 && (
            <span style={{ color: '#64748b' }}>
              请假：<strong style={{ color: '#d97706', fontSize: 18 }}>{summary.leaveHours}h</strong>
              <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 4 }}>（{(summary.leaveHours / 8).toFixed(2)} 人天）</span>
            </span>
          )}
        </Space>
      </Card>

      <Tabs defaultActiveKey="tasks" style={{ marginBottom: 24 }} size="large">
        <Tabs.TabPane tab="按日期查看" key="tasks">
          {dateSummary.length === 0 ? (
            <Card style={{ textAlign: 'center', color: '#94a3b8' }} size="small">
              当前周期暂无数据
            </Card>
          ) : (
            <>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  size="small"
                  icon={expandedDateKeys.length === dateSummary.length ? <CompressOutlined /> : <ExpandAltOutlined />}
                  onClick={() =>
                    setExpandedDateKeys(
                      expandedDateKeys.length === dateSummary.length ? [] : dateSummary.map((d) => d.date),
                    )
                  }
                >
                  {expandedDateKeys.length === dateSummary.length ? '全部折叠' : '全部展开'}
                </Button>
              </div>
              <Collapse
                activeKey={expandedDateKeys}
                onChange={(keys) => setExpandedDateKeys(keys as string[])}
                items={dateSummary.map((ds) => {
                  const isShort = ds.totalHours !== 8;
                  const dayRows = rows.filter((r) => r.date === ds.date);
                  return {
                    key: ds.date,
                    label: (
                      <Space size={12} align="center">
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{ds.date}</span>
                        {ds.taskCount > 0 && (
                          <Tag color="blue" style={{ margin: 0 }}>{ds.taskCount} 个任务</Tag>
                        )}
                        {ds.leaveHours > 0 && (
                          <Tag color="orange" style={{ margin: 0 }}>
                            <CoffeeOutlined style={{ marginRight: 2 }} />{ds.leaveHours}h 请假
                          </Tag>
                        )}
                      </Space>
                    ),
                    extra: (
                      <span style={{ color: '#64748b', fontSize: 13 }}>
                        工时：
                        <strong
                          style={{
                            color: isShort ? '#dc2626' : '#059669',
                            fontSize: 16,
                            marginLeft: 2,
                          }}
                        >
                          {ds.totalHours}h
                        </strong>
                        {isShort && (
                          <span style={{ color: '#dc2626', fontSize: 12, marginLeft: 4 }}>
                            （缺{8 - ds.totalHours}h）
                          </span>
                        )}
                      </span>
                    ),
                    children: (
                      <Table
                        dataSource={dayRows}
                        columns={dateViewColumns}
                        rowKey="key"
                        size="small"
                        pagination={false}
                      />
                    ),
                  };
                })}
                style={{ background: '#fff' }}
              />
            </>
          )}
        </Tabs.TabPane>
        <Tabs.TabPane tab="按项目查看" key="projects">
          {projectSummary.length === 0 ? (
            <Card style={{ textAlign: 'center', color: '#94a3b8' }} size="small">
              当前周期暂无数据
            </Card>
          ) : (
            <>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  size="small"
                  icon={expandedProjectKeys.length === projectSummary.length ? <CompressOutlined /> : <ExpandAltOutlined />}
                  onClick={() =>
                    setExpandedProjectKeys(
                      expandedProjectKeys.length === projectSummary.length ? [] : projectSummary.map((p) => p.projectName),
                    )
                  }
                >
                  {expandedProjectKeys.length === projectSummary.length ? '全部折叠' : '全部展开'}
                </Button>
              </div>
              <Collapse
                activeKey={expandedProjectKeys}
                onChange={(keys) => setExpandedProjectKeys(keys as string[])}
                items={projectSummary.map((ps) => {
                  const projectRows = rows
                    .filter((r) => r.projectName === ps.projectName)
                    .sort((a, b) => a.date.localeCompare(b.date));
                  // 计算每个日期在排序后的首次出现位置，用于 rowSpan 合并
                  const dateFirstIndex = new Map<string, number>();
                  projectRows.forEach((r, idx) => {
                    if (!dateFirstIndex.has(r.date)) dateFirstIndex.set(r.date, idx);
                  });
                  const dateCount = new Map<string, number>();
                  projectRows.forEach((r) => dateCount.set(r.date, (dateCount.get(r.date) || 0) + 1));
                  return {
                    key: ps.projectName,
                    label: (
                      <Space size={12} align="center">
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{ps.projectName}</span>
                        {ps.contactPerson && (
                          <span style={{ color: '#64748b', fontSize: 13 }}>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {ps.contactPerson}
                          </span>
                        )}
                        {ps.taskCount > 0 && (
                          <Tag color="purple" style={{ margin: 0 }}>{ps.taskCount} 个任务</Tag>
                        )}
                      </Space>
                    ),
                    extra: (
                      <Space size={16} align="center">
                        <span style={{ color: '#64748b', fontSize: 13 }}>
                          占比：<strong style={{ color: '#722ed1', fontSize: 14, marginLeft: 2 }}>
                            {denominator > 0 ? ((ps.totalHours / denominator) * 100).toFixed(1) : '0.0'}%
                          </strong>
                        </span>
                        <span style={{ color: '#64748b', fontSize: 13 }}>
                          人天：<strong style={{ color: '#52c41a', fontSize: 14, marginLeft: 2 }}>
                            {(ps.totalHours / 8).toFixed(2)}
                          </strong>
                        </span>
                        <span style={{ color: '#64748b', fontSize: 13 }}>
                          工时：<strong style={{ color: '#2563eb', fontSize: 16, marginLeft: 2 }}>{ps.totalHours}h</strong>
                        </span>
                      </Space>
                    ),
                    children: (
                      <Table
                        dataSource={projectRows}
                        columns={[
                          {
                            title: '日期',
                            dataIndex: 'date',
                            key: 'date',
                            width: 110,
                            onCell: (record: StatRow, index?: number) => {
                              const firstIdx = dateFirstIndex.get(record.date)!;
                              const span = dateCount.get(record.date)!;
                              return { rowSpan: index === firstIdx ? span : 0 };
                            },
                            render: (date: string) => (
                              <span style={{ color: '#475569', fontWeight: 500 }}>{date}</span>
                            ),
                          },
                          ...commonTaskColumns,
                        ]}
                        rowKey="key"
                        size="small"
                        pagination={false}
                      />
                    ),
                  };
                })}
                style={{ background: '#fff' }}
              />
            </>
          )}
        </Tabs.TabPane>
      </Tabs>

      <Modal title="编辑任务" open={taskModalOpen} onOk={handleSaveTask} onCancel={() => setTaskModalOpen(false)} width={560}>
        <Form form={taskForm} layout="vertical">
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

      <Modal title="编辑请假" open={leaveModalOpen} onOk={handleSaveLeave} onCancel={() => setLeaveModalOpen(false)} width={480}>
        <Form form={leaveForm} layout="vertical">
          <Space>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={leaveTypes.map((t) => ({ value: t.id, label: t.label }))} />
            </Form.Item>
            <Form.Item name="hours" label="时长（小时）" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.5} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
