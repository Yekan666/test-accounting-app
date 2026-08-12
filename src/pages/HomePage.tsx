import { useState } from "react";
import {
  Card,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Button,
  Radio,
  message,
  Space,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { addRecord } from "../db/database";
import { getDefaultCategories } from "../utils/categories";
import type { NewRecord } from "../types";

export default function HomePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [recordType, setRecordType] = useState<"expense" | "income">("expense");
  const [selectedMain, setSelectedMain] = useState<string | null>(null);

  const categories = getDefaultCategories(recordType);
  const mainOptions = categories.map((c) => ({
    value: c.main,
    label: `${c.icon} ${c.main}`,
  }));

  const subOptions: { value: string; label: string }[] = [];
  if (selectedMain) {
    const cat = categories.find((c) => c.main === selectedMain);
    if (cat) {
      subOptions.push(...cat.subs.map((s) => ({ value: s, label: s })));
    }
  }

  const handleTypeChange = (type: "expense" | "income") => {
    setRecordType(type);
    setSelectedMain(null);
    form.setFieldsValue({ category_main: undefined, category_sub: undefined });
  };

  const handleMainChange = (main: string) => {
    setSelectedMain(main);
    form.setFieldsValue({ category_sub: undefined });
  };

  const handleSubmit = async (values: {
    amount: number;
    category_main: string;
    category_sub: string;
    date: Dayjs;
    note?: string;
  }) => {
    setLoading(true);
    try {
      const record: NewRecord = {
        type: recordType,
        amount: values.amount,
        category_main: values.category_main,
        category_sub: values.category_sub,
        date: values.date.format("YYYY-MM-DD"),
        note: values.note || "",
      };
      await addRecord(record);
      message.success("记账成功！");
      form.resetFields();
      setSelectedMain(null);
    } catch (err) {
      message.error("记账失败：" + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{ maxWidth: 520, margin: "0 auto" }}
      title={
        <Space>
          {recordType === "expense" ? "📝" : "💰"}
          <span>记一笔</span>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ date: dayjs(), type: "expense" }}
      >
        {/* 类型切换 */}
        <Form.Item label="类型">
          <Radio.Group
            value={recordType}
            onChange={(e) => handleTypeChange(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="expense" style={{ color: recordType === "expense" ? "#ff4d4f" : undefined }}>
              支出
            </Radio.Button>
            <Radio.Button value="income" style={{ color: recordType === "income" ? "#52c41a" : undefined }}>
              收入
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 金额 */}
        <Form.Item
          label="金额（元）"
          name="amount"
          rules={[{ required: true, message: "请输入金额" }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0.01}
            max={99999999.99}
            precision={2}
            placeholder="0.00"
            prefix="¥"
            size="large"
          />
        </Form.Item>

        {/* 一级分类 */}
        <Form.Item
          label="一级分类"
          name="category_main"
          rules={[{ required: true, message: "请选择分类" }]}
        >
          <Select
            options={mainOptions}
            placeholder="选择大类"
            onChange={handleMainChange}
            size="large"
          />
        </Form.Item>

        {/* 二级分类 */}
        <Form.Item
          label="二级分类"
          name="category_sub"
          rules={[{ required: true, message: "请选择小类" }]}
        >
          <Select
            options={subOptions}
            placeholder={selectedMain ? "选择小类" : "请先选择大类"}
            disabled={!selectedMain}
            size="large"
          />
        </Form.Item>

        {/* 日期 */}
        <Form.Item
          label="日期"
          name="date"
          rules={[{ required: true, message: "请选择日期" }]}
        >
          <DatePicker style={{ width: "100%" }} size="large" />
        </Form.Item>

        {/* 备注 */}
        <Form.Item label="备注" name="note">
          <Input.TextArea
            placeholder="写点什么..."
            rows={2}
            maxLength={200}
            showCount
          />
        </Form.Item>

        {/* 提交按钮 */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
            block
            size="large"
            style={{
              background: recordType === "expense" ? "#ff4d4f" : "#52c41a",
              borderColor: recordType === "expense" ? "#ff4d4f" : "#52c41a",
            }}
          >
            记一笔
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
