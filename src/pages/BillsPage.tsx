import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Select,
  DatePicker,
  Space,
  Tag,
  Button,
  Popconfirm,
  message,
  Typography,
} from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { getRecords, deleteRecord } from "../db/database";
import { getCategoryIcon } from "../utils/categories";
import type { Record } from "../types";

const { RangePicker } = DatePicker;

export default function BillsPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const filter: {
        type?: "expense" | "income";
        date_from?: string;
        date_to?: string;
      } = {};
      if (typeFilter !== "all") filter.type = typeFilter;
      if (dateRange) {
        filter.date_from = dateRange[0].format("YYYY-MM-DD");
        filter.date_to = dateRange[1].format("YYYY-MM-DD");
      }
      const data = await getRecords(filter);
      setRecords(data);
    } catch (err) {
      message.error("加载失败：" + String(err));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateRange]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDelete = async (id: number) => {
    try {
      await deleteRecord(id);
      message.success("已删除");
      loadRecords();
    } catch (err) {
      message.error("删除失败：" + String(err));
    }
  };

  const columns: ColumnsType<Record> = [
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 80,
      render: (type: string) =>
        type === "expense" ? (
          <Tag color="red">支出</Tag>
        ) : (
          <Tag color="green">收入</Tag>
        ),
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount: number, record: Record) => (
        <Typography.Text
          strong
          style={{
            color: record.type === "expense" ? "#ff4d4f" : "#52c41a",
            fontSize: 16,
          }}
        >
          {record.type === "expense" ? "-" : "+"}¥{amount.toFixed(2)}
        </Typography.Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "分类",
      key: "category",
      width: 160,
      render: (_: unknown, record: Record) => {
        const icon = getCategoryIcon(record.category_main, record.type);
        return (
          <span>
            {icon} {record.category_main} / {record.category_sub}
          </span>
        );
      },
    },
    {
      title: "日期",
      dataIndex: "date",
      key: "date",
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "备注",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (note: string) => note || "-",
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_: unknown, record: Record) => (
        <Popconfirm
          title="确定删除？"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="账单列表"
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadRecords}>
          刷新
        </Button>
      }
    >
      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 120 }}
          options={[
            { value: "all", label: "全部" },
            { value: "expense", label: "支出" },
            { value: "income", label: "收入" },
          ]}
        />
        <RangePicker
          value={dateRange as [Dayjs, Dayjs] | null}
          onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
          placeholder={["开始日期", "结束日期"]}
        />
      </Space>

      {/* 记录表格 */}
      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
        scroll={{ x: 700 }}
        locale={{ emptyText: "暂无记录，去记一笔吧！" }}
      />
    </Card>
  );
}
