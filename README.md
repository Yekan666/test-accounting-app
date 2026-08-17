# 黑马记账 📒

一款基于 **Tauri v2** 的本地桌面记账应用。界面简洁、数据完全存储在本地，无需联网、无需注册账号，隐私安全。

## ✨ 功能特性

- **记一笔**：快速记录支出 / 收入，支持金额、两级分类、日期、备注
- **账单列表**：按时间倒序展示，支持按类型、日期范围筛选，可删除记录
- **月度统计**：总收入、总支出、结余一目了然，配分类占比饼图与每日收支趋势柱状图
- **分类管理**：系统预设两级分类 + 自定义分类（新增 / 改名 / 删除），每个分类可选专属表情图标
- **下拉直接管理**：记账时可直接在下拉菜单里新建、改名、删除分类，无需切换页面
- **数据导出**：一键导出全部账单为 CSV 或 Excel（.xlsx）文件
- **本地存储**：数据保存在本地 SQLite 数据库，不经过任何服务器

## 🛠️ 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端框架 | React 19 + TypeScript |
| UI 组件库 | Ant Design 6 |
| 图表库 | Recharts 3 |
| 本地数据库 | SQLite（tauri-plugin-sql） |
| Excel 导出 | xlsx (SheetJS) |
| 日期处理 | dayjs |
| 构建工具 | Vite 8 |

## 📁 项目结构

```
heimabookkeeping/
├── src/                      # React 前端源码
│   ├── App.tsx               # 应用入口（主题与中文本地化）
│   ├── main.tsx              # React 渲染入口
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx        # 整体布局（侧边栏 + 内容区）
│   │   └── CategoryFormModal.tsx # 共享的分类新增/编辑弹窗
│   ├── pages/                # 页面组件
│   │   ├── HomePage.tsx      # 记一笔
│   │   ├── BillsPage.tsx     # 账单列表
│   │   ├── StatsPage.tsx     # 统计图表
│   │   ├── CategoriesPage.tsx # 分类管理
│   │   └── SettingsPage.tsx  # 设置 / 数据导出
│   ├── db/
│   │   └── database.ts       # SQLite 增删改查
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   └── utils/
│       └── categories.ts     # 预设分类与分类工具函数
├── src-tauri/                # Tauri Rust 后端
│   ├── src/                  # Rust 入口与插件注册
│   ├── Cargo.toml            # Rust 依赖
│   └── tauri.conf.json       # Tauri 配置
├── package.json
├── vite.config.ts
└── README.md
```

## 🗂️ 分类体系

**支出分类**（预设 10 大类）：🍽️ 餐饮 · 🚗 交通 · 🛒 购物 · 🏠 居住 · 🎮 娱乐 · 💊 医疗 · 📚 教育 · 📱 通讯 · 👗 服饰 · 📦 其他

**收入分类**（预设 5 大类）：💰 工资 · 🧧 红包 · 📈 理财 · 💼 兼职 · 📦 其他收入

> 预设分类之外，可自由创建自己的两级分类，并为每个小类挑选专属图标。

## 🚀 开发

### 环境要求

- Node.js >= 18
- Rust（Windows 需 MSVC 工具链，即 Visual Studio Build Tools 中的 C++ 工作负载）
- Windows 10+ 或 macOS 11+

### 常用命令

```bash
# 安装依赖
npm install

# 启动开发模式（前端热更新 + 桌面窗口）
npx tauri dev

# TypeScript 类型检查
npx tsc -b --noEmit

# 构建发布安装包（Windows 下生成 NSIS 安装程序）
npx tauri build
```

## 📄 数据库

数据保存在应用本地目录的 `heimabookkeeping.db`（SQLite）中，核心两张表：

- `records` — 账单记录（类型、金额、分类、日期、备注）
- `custom_categories` — 用户自定义分类（大类 + 小类 + 图标）

删除应用数据前请先使用「设置 → 数据导出」备份账单。
