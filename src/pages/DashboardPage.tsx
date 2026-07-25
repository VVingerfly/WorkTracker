import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { StatisticsService } from '../services/StatisticsService';
import { ProjectService } from '../services/ProjectService';
import type { Task } from '../types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types';

export function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [monthSummary, setMonthSummary] = useState({ totalHours: 0, taskCount: 0, doneCount: 0, leaveHours: 0 });
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const summary = await StatisticsService.getTodaySummary();
    const month = await StatisticsService.getMonthSummary();
    const projects = await ProjectService.getProjects();
    setTasks(summary.tasks);
    setTotalHours(summary.totalHours);
    setMonthSummary(month);
    setProjectNames(new Map(projects.map((p) => [p.id, p.name])));
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
      render: (p: keyof typeof TASK_PRIORITY_LABELS) => (
        <Tag color={p === 'high' ? 'red' : p === 'medium' ? 'orange' : 'default'}>
          {TASK_PRIORITY_LABELS[p]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: keyof typeof TASK_STATUS_LABELS) => (
        <Tag color={s === 'done' ? 'green' : s === 'in_progress' ? 'blue' : 'default'}>
          {TASK_STATUS_LABELS[s]}
        </Tag>
      ),
    },
    { title: '工时', dataIndex: 'workHours', key: 'workHours', render: (h: number) => `${h}h` },
  ];

  return (
    <div>
      <h2>今日概览 — {dayjs().format('YYYY-MM-DD')}</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="今日任务" value={tasks.length} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="今日工时" value={totalHours} suffix="h" /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="本月工时" value={monthSummary.totalHours} suffix="h" /></Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月完成"
              value={monthSummary.doneCount}
              suffix={`/ ${monthSummary.taskCount}`}
            />
          </Card>
        </Col>
      </Row>
      <Card title="今日任务列表">
        <Table dataSource={tasks} columns={columns} rowKey="id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
