import { useState } from "react";
import {
  Card,
  Button,
  Space,
  Divider,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
} from "@ant-design/icons";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "../utils/categories";
import { getAllRecords } from "../db/database";
import * as XLSX from "xlsx";

const categories = {
  expense: [...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c }))],
  income: [...DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c }))],
};

/** 生成默认文件名 */
function defaultFileName(ext: string): string {
  return `黑马记账_导出_${new Date().toISOString().slice(0, 10)}.${ext}`;
}

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);

  /** 导出 CSV */
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const records = await getAllRecords();
      if (records.length === 0) {
        message.warning("暂无数据可导出");
        return;
      }

      // 弹出原生保存对话框
      const filePath = await save({
        defaultPath: defaultFileName("csv"),
        filters: [{ name: "CSV 文件", extensions: ["csv"] }],
      });

      // 用户取消了
      if (!filePath) return;

      const headers = ["类型", "金额", "一级分类", "二级分类", "日期", "备注"];
      const rows = records.map((r) => [
        r.type === "expense" ? "支出" : "收入",
        r.amount.toFixed(2),
        r.category_main,
        r.category_sub,
        r.date,
        r.note,
      ]);

      const BOM = "﻿";
      const csvContent =
        BOM +
        [headers.join(","), ...rows.map((row) => row.map((v) => `"${v}"`).join(","))].join("\n");

      await writeTextFile(filePath, csvContent);
      message.success(`CSV 已保存到：${filePath}`);
    } catch (err) {
      message.error("导出失败：" + String(err));
    } finally {
      setExporting(false);
    }
  };

  /** 导出 Excel */
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const records = await getAllRecords();
      if (records.length === 0) {
        message.warning("暂无数据可导出");
        return;
      }

      // 弹出原生保存对话框
      const filePath = await save({
        defaultPath: defaultFileName("xlsx"),
        filters: [{ name: "Excel 文件", extensions: ["xlsx"] }],
      });

      // 用户取消了
      if (!filePath) return;

      const data = records.map((r) => ({
        类型: r.type === "expense" ? "支出" : "收入",
        金额: r.amount,
        一级分类: r.category_main,
        二级分类: r.category_sub,
        日期: r.date,
        备注: r.note,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "账单");

      // 生成 Excel 文件的二进制数据
      const excelData = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      await writeFile(filePath, new Uint8Array(excelData));

      message.success(`Excel 已保存到：${filePath}`);
    } catch (err) {
      message.error("导出失败：" + String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%", maxWidth: 600 }} size="large">
      {/* 数据导出 */}
      <Card title="数据导出">
        <Typography.Paragraph type="secondary">
          将所有记账数据导出为文件，方便备份或在其他软件中查看。
        </Typography.Paragraph>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
            loading={exporting}
          >
            导出 CSV
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={exporting}
            style={{ background: "#52c41a", borderColor: "#52c41a", color: "#fff" }}
          >
            导出 Excel
          </Button>
        </Space>
      </Card>

      {/* 分类管理 — 仅展示，编辑功能后续迭代 */}
      <Card title="分类设置">
        <Typography.Paragraph type="secondary">
          当前使用的支出和收入分类。自定义分类编辑功能将在后续版本中推出。
        </Typography.Paragraph>

        <Typography.Title level={5}>支出分类</Typography.Title>
        {categories.expense.map((cat) => (
          <div key={cat.main} style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {cat.icon} {cat.main}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary">
              {cat.subs.join(" · ")}
            </Typography.Text>
          </div>
        ))}

        <Divider />

        <Typography.Title level={5}>收入分类</Typography.Title>
        {categories.income.map((cat) => (
          <div key={cat.main} style={{ marginBottom: 8 }}>
            <Typography.Text strong>
              {cat.icon} {cat.main}
            </Typography.Text>
          </div>
        ))}
      </Card>

      {/* 关于 */}
      <Card title="关于">
        <Typography.Paragraph>
          <Typography.Text strong>黑马记账</Typography.Text> v0.1.0
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          一款轻量级个人记账桌面应用，支持 Windows 和 macOS。
          <br />
          技术栈：Tauri + React + TypeScript + SQLite
        </Typography.Paragraph>
      </Card>
    </Space>
  );
}
