import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Spin,
  message,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { getMonthlyStats, getCategoryStats, getDailyTrend } from "../db/database";

// 饼图颜色
const PIE_COLORS = [
  "#ff4d4f", "#f5222d", "#fa8c16", "#fadb14", "#52c41a",
  "#13c2c2", "#1677ff", "#722ed1", "#eb2f96", "#fa541c",
];

/** 生成最近 12 个月的选项 */
function getMonthOptions() {
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = dayjs().subtract(i, "month");
    options.push({
      value: d.format("YYYY-MM"),
      label: d.format("YYYY 年 M 月"),
    });
  }
  return options;
}

export default function StatsPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState({ total_income: 0, total_expense: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<
    { date: string; expense: number; income: number }[]
  >([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      const [stats, catStats, daily] = await Promise.all([
        getMonthlyStats(year, month),
        getCategoryStats(year, month),
        getDailyTrend(year, month),
      ]);

      setMonthlyData(stats);

      setCategoryData(
        catStats.map((c) => ({
          name: c.category_main,
          value: c.total,
        }))
      );

      // 填充当月所有日期
      const daysInMonth = dayjs(selectedMonth).daysInMonth();
      const fullDaily = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedMonth}-${String(d).padStart(2, "0")}`;
        const found = daily.find((r) => r.date === dateStr);
        fullDaily.push({
          date: `${d}日`,
          expense: found?.expense ?? 0,
          income: found?.income ?? 0,
        });
      }
      setDailyData(fullDaily);
    } catch (err) {
      message.error("加载统计数据失败：" + String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const balance = monthlyData.total_income - monthlyData.total_expense;

  // 饼图自定义标签
  const renderPieLabel = (props: { name?: string; percent?: number }) => {
    const { name, percent = 0 } = props;
    if (percent < 0.03) return "";
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        {/* 月份选择 */}
        <Card size="small">
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={getMonthOptions()}
            style={{ width: 180 }}
          />
        </Card>

        {/* 月度概览卡片 */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="总收入"
                value={monthlyData.total_income}
                precision={2}
                prefix="¥"
                styles={{ content: { color: "#52c41a" } }}
                suffix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="总支出"
                value={monthlyData.total_expense}
                precision={2}
                prefix="¥"
                styles={{ content: { color: "#ff4d4f" } }}
                suffix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="结余"
                value={balance}
                precision={2}
                prefix="¥"
                styles={{ content: { color: balance >= 0 ? "#1677ff" : "#ff4d4f" } }}
                suffix={<WalletOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表区 */}
        <Row gutter={16}>
          {/* 支出分类占比饼图 */}
          <Col xs={24} lg={12}>
            <Card title="支出分类占比">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={renderPieLabel}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `¥${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 350,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#999",
                  }}
                >
                  暂无支出数据
                </div>
              )}
            </Card>
          </Col>

          {/* 每日收支趋势柱状图 */}
          <Col xs={24} lg={12}>
            <Card title="每日收支趋势">
              {dailyData.some((d) => d.expense > 0 || d.income > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `¥${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="expense" fill="#ff4d4f" name="支出" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="income" fill="#52c41a" name="收入" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 350,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#999",
                  }}
                >
                  暂无数据
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </Spin>
  );
}
