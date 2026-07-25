import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Space, Statistic, Table, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { StatisticsService, type StatRow } from '../services/StatisticsService';
import { ExportService } from '../services/ExportService';
import { TASK_STATUS_LABELS } from '../types';

export function StatisticsPage() {
  const [rows, setRows] = useState<StatRow[]>([]);
  const [summary, setSummary] = useState({ totalHours: 0, taskCount: 0, doneCount: 0, leaveHours: 0 });
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  useEffect(() => { loadData(selectedMonth); }, [selectedMonth]);

  async function loadData(month: dayjs.Dayjs) {
    const [statRows, monthSummary] = await Promise.all([
      StatisticsService.getStatRows(month),
      StatisticsService.getMonthSummary(month),
    ]);
    setRows(statRows);
    setSummary(monthSummary);
  }

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '项目', dataIndex: 'projectName', key: 'projectName' },
    { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
    { title: '工时', dataIndex: 'workHours', key: 'workHours', width: 80, render: (h: number) => `${h}h` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={s === 'done' ? 'green' : s === 'in_progress' ? 'blue' : 'default'}>
          {TASK_STATUS_LABELS[s as keyof typeof TASK_STATUS_LABELS] ?? s}
        </Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>工时统计</h2>
        <DatePicker picker="month" value={selectedMonth} onChange={(d) => d && setSelectedMonth(d)} />
        <Button icon={<DownloadOutlined />} onClick={() => ExportService.exportToExcel(selectedMonth)}>
          导出 Excel
        </Button>
      </Space>

      <Space size="large" style={{ marginBottom: 16 }}>
        <Card size="small"><Statistic title="总工时" value={summary.totalHours} suffix="h" /></Card>
        <Card size="small"><Statistic title="任务数" value={summary.taskCount} /></Card>
        <Card size="small"><Statistic title="已完成" value={summary.doneCount} /></Card>
        <Card size="small"><Statistic title="请假" value={summary.leaveHours} suffix="h" /></Card>
      </Space>

      <Table
        dataSource={rows}
        columns={columns}
        rowKey="key"
        size="small"
        bordered
        pagination={{ pageSize: 20 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}><strong>合计</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={1}><strong>{summary.totalHours}h</strong></Table.Summary.Cell>
            <Table.Summary.Cell index={2} colSpan={2} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
