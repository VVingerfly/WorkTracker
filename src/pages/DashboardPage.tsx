import { useEffect, useState } from 'react';
import { Card, Col, DatePicker, Row, Select, Statistic, Table, Tag, Space, message } from 'antd';
import { ArrowUpOutlined, CheckCircleOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import type { Task } from '../types';
import { ConfigService } from '../services/ConfigService';

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());
  const [priorities, setPriorities] = useState<{ id: string; label: string; color: string }[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, dateRange, statusFilter]);

  async function loadData() {
    await ProjectService.resetCache();
    await TaskService.resetCache();
    const [ts, projects] = await Promise.all([TaskService.getTasks(), ProjectService.getProjects()]);
    setTasks(ts);
    setProjectNames(new Map(projects.map((p) => [p.id, p.name])));
  }

  async function loadConfig() {
    const [p, s] = await Promise.all([ConfigService.getPriorities(), ConfigService.getTaskStatuses()]);
    setPriorities(p);
    setTaskStatuses(s);
  }

  function applyFilters() {
    let result = [...tasks];

    if (statusFilter !== 'all') {
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

  const columns = [
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
      width: 80,
      render: (p: string) => {
        const priority = priorities.find((pr) => pr.id === p);
        return priority ? <Tag color={priority.color}>{priority.label}</Tag> : p;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => {
        const status = taskStatuses.find((st) => st.id === s);
        return status ? <Tag color={status.color}>{status.label}</Tag> : s;
      },
    },
    { title: '工时', dataIndex: 'workHours', key: 'workHours', width: 70, render: (h: number) => `${h}h` },
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
              ...taskStatuses.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
          <button
            onClick={() => {
              setDateRange(null);
              setStatusFilter('all');
              message.success('已重置筛选条件');
            }}
            style={{ padding: '4px 16px', border: '1px solid #d9d9d9', borderRadius: 8, cursor: 'pointer', background: '#fff' }}
          >
            重置
          </button>
        </Space>
      </Card>

      <Card title="任务列表" style={{ background: '#fff' }}>
        <Table
          dataSource={filteredTasks}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
          style={{ background: '#fff' }}
        />
      </Card>
    </div>
  );
}
