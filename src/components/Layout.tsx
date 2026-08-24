import { useState } from "react";
import { Layout as AntLayout, Menu, Typography } from "antd";
import {
  PlusCircleOutlined,
  UnorderedListOutlined,
  PieChartOutlined,
  TagsOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import HomePage from "../pages/HomePage";
import BillsPage from "../pages/BillsPage";
import StatsPage from "../pages/StatsPage";
import CategoriesPage from "../pages/CategoriesPage";
import SettingsPage from "../pages/SettingsPage";

const { Sider, Content, Header } = AntLayout;

type PageKey = "home" | "bills" | "stats" | "categories" | "settings";

const menuItems = [
  { key: "home", icon: <PlusCircleOutlined />, label: "记一笔" },
  { key: "bills", icon: <UnorderedListOutlined />, label: "账单" },
  { key: "stats", icon: <PieChartOutlined />, label: "统计" },
  { key: "categories", icon: <TagsOutlined />, label: "分类管理" },
  { key: "settings", icon: <SettingOutlined />, label: "设置" },
];

/** 整体布局：左侧导航栏 + 顶部标题栏 + 内容区，负责在 5 个页面间切换 */
export default function Layout() {
  const [currentPage, setCurrentPage] = useState<PageKey>("home");

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "bills":
        return <BillsPage />;
      case "stats":
        return <StatsPage />;
      case "categories":
        return <CategoriesPage />;
      case "settings":
        return <SettingsPage />;
    }
  };

  return (
    <AntLayout style={{ height: "100vh" }}>
      <Sider
        width={180}
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Typography.Text
            strong
            style={{ color: "#fff", fontSize: 20, letterSpacing: 2 }}
          >
            🐴 黑马记账
          </Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={({ key }) => setCurrentPage(key as PageKey)}
          items={menuItems}
          style={{
            background: "transparent",
            color: "#fff",
            borderRight: "none",
            marginTop: 8,
          }}
          theme="dark"
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography.Title level={4} style={{ margin: 0 }}>
            {menuItems.find((m) => m.key === currentPage)?.label}
          </Typography.Title>
        </Header>
        <Content
          style={{
            padding: 24,
            background: "#f5f5f5",
            overflow: "auto",
          }}
        >
          {renderPage()}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
