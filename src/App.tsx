import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "./components/Layout";

/** 应用根组件：配置 Ant Design 中文语言包与全局主题 */
export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Layout />
      </AntApp>
    </ConfigProvider>
  );
}
