import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Space, Statistic, Table, Tag, Radio, Tabs } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CoffeeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatisticsService, type StatRow } from '../services/StatisticsService';
import { ExportService } from '../services/ExportService';
import { ProjectService } from '../services/ProjectService';
import { TaskService } from '../services/TaskService';
import { ConfigService } from '../services/ConfigService';

export function StatisticsPage() {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [summary, setSummary] = useState({ totalHours: 0, taskCount: 0, doneCount: 0, leaveHours: 0 });
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [taskStatuses, setTaskStatuses] = useState<{ id: string; label: string; color: string }[]>([]);
  const [priorities, setPriorities] = useState<{ id: string; label: string; color: string }[]>([]);
  const [rangeText, setRangeText] = useState('');

  useEffect(() => { loadData(selectedDate, viewType); }, [selectedDate, viewType]);

  async function loadData(date: dayjs.Dayjs, type: 'month' | 'week') {
    await ProjectService.resetCache();
    await TaskService.resetCache();
    const [range, statRows, periodSummary, statuses, priorityOptions] = await Promise.all([
      type === 'month' ? StatisticsService.getMonthRange(date) : StatisticsService.getWeekRange(date),
      StatisticsService.getStatRows(date, type),
      StatisticsService.getMonthSummary(date, type),
      ConfigService.getTaskStatuses(),
      ConfigService.getPriorities(),
    ]);
    setRows(statRows);
    setSummary(periodSummary);
    setTaskStatuses(statuses);
    setPriorities(priorityOptions);
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

  const projectSummary = rows.reduce((acc, row) => {
    const existing = acc.find((p) => p.projectName === row.projectName);
    if (existing) {
      existing.taskCount += 1;
      existing.totalHours += row.workHours;
    } else {
      acc.push({
        projectName: row.projectName,
        taskCount: 1,
        totalHours: row.workHours,
      });
    }
    return acc;
  }, [] as { projectName: string; taskCount: number; totalHours: number }[]);

  const projectColumns = [
    { title: '项目', dataIndex: 'projectName', key: 'projectName' },
    { title: '任务数', dataIndex: 'taskCount', key: 'taskCount', width: 100 },
    { title: '总工时', dataIndex: 'totalHours', key: 'totalHours', width: 100, render: (h: number) => `${h}h` },
  ];

  const dateSummary = rows.reduce((acc, row) => {
    const existing = acc.find((d) => d.date === row.date);
    if (existing) {
      existing.taskCount += 1;
      existing.totalHours += row.workHours;
    } else {
      acc.push({
        date: row.date,
        taskCount: 1,
        totalHours: row.workHours,
      });
    }
    return acc;
  }, [] as { date: string; taskCount: number; totalHours: number }[]);

  const dateColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '任务数', dataIndex: 'taskCount', key: 'taskCount', width: 100 },
    { 
      title: '总工时', 
      dataIndex: 'totalHours', 
      key: 'totalHours', 
      width: 100, 
      render: (h: number) => (
        <span style={{ color: h !== 8 ? '#f5222d' : undefined, fontWeight: h !== 8 ? 'bold' : undefined }}>
          {h}h
        </span>
      ),
    },
  ];

  const taskDetailColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '项目', dataIndex: 'projectName', key: 'projectName' },
    { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
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
    { title: '工时', dataIndex: 'workHours', key: 'workHours', width: 80, render: (h: number) => `${h}h` },
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
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#1e293b' }}>工时统计</h2>
          <p style={{ color: '#64748b', marginTop: 4 }}>查看指定周期内的任务工时统计</p>
        </div>
        <Button icon={<DownloadOutlined />} onClick={() => ExportService.exportToExcel(selectedDate)}>
          导出 Excel
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
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
        </Space>
        <div style={{ marginTop: 12, color: '#64748b' }}>
          当前周期：{rangeText}
        </div>
      </Card>

      <Space size="large" style={{ marginBottom: 24, width: '100%' }}>
        <Card
          hoverable
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>总工时</span>}
            value={summary.totalHours}
            suffix="h"
            prefix={<CalendarOutlined />}
            valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
          />
        </Card>
        <Card
          hoverable
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>任务数</span>}
            value={summary.taskCount}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
          />
        </Card>
        <Card
          hoverable
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>已完成</span>}
            value={summary.doneCount}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
          />
        </Card>
        <Card
          hoverable
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            border: 'none',
          }}
        >
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>请假</span>}
            value={summary.leaveHours}
            suffix="h"
            prefix={<CoffeeOutlined />}
            valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
          />
        </Card>
      </Space>

      <Tabs defaultActiveKey="tasks" style={{ marginBottom: 16 }}>
        <Tabs.TabPane tab="任务列表" key="tasks">
          <Card title="任务列表" style={{ background: '#fff' }}>
            <Table
              dataSource={dateSummary}
              columns={dateColumns}
              rowKey="date"
              size="small"
              bordered
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    dataSource={rows.filter((r) => r.date === record.date)}
                    columns={taskDetailColumns}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}><strong>{record.date} 小计</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <span style={{ color: record.totalHours !== 8 ? '#f5222d' : undefined, fontWeight: record.totalHours !== 8 ? 'bold' : undefined }}>
                            <strong>{record.totalHours}h</strong>
                          </span>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    )}
                  />
                ),
              }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>合计</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><strong>{summary.taskCount}个任务</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><strong>{summary.totalHours}h</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Tabs.TabPane>
        <Tabs.TabPane tab="项目汇总" key="projects">
          <Card title="项目汇总" style={{ background: '#fff' }}>
            <Table
              dataSource={projectSummary}
              columns={projectColumns}
              rowKey="projectName"
              size="small"
              bordered
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    dataSource={rows.filter((r) => r.projectName === record.projectName)}
                    columns={taskDetailColumns}
                    rowKey="key"
                    size="small"
                    pagination={false}
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2}><strong>{record.projectName} 小计</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1}><strong>{record.totalHours}h</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    )}
                  />
                ),
              }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><strong>合计</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><strong>{summary.taskCount}个任务</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}><strong>{summary.totalHours}h</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
