# 黑马记账 — 项目文档

## 项目概述

- **应用名称**：黑马记账
- **应用类型**：桌面应用（Windows + Mac）
- **技术栈**：Tauri v2 + React 19 + TypeScript + SQLite
- **货币单位**：人民币（¥/元）
- **记录类型**：支出 + 收入

## 核心功能

1. **记一笔**：记录每笔账目（支出/收入），含金额、分类、日期、备注
2. **账单列表**：按时间倒序展示，支持按类型/分类/日期筛选
3. **月度收支统计**：总收入、总支出、结余 + 分类饼图 + 每日趋势柱状图
4. **分类管理**：两级分类（大类 → 小类）
5. **数据导出**：CSV 和 Excel（.xlsx）格式

## 技术栈

| 层次 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端框架 | React 19 + TypeScript |
| UI 组件库 | Ant Design 6 |
| 图表库 | Recharts |
| 本地数据库 | SQLite（tauri-plugin-sql） |
| 构建工具 | Vite |
| Excel 导出 | xlsx (SheetJS) |
| 日期处理 | dayjs |

## 项目结构

```
├── src/                      # React 前端源码
│   ├── App.tsx               # 应用入口（主题、中文语言包）
│   ├── main.tsx              # React 渲染入口
│   ├── index.css             # 全局样式
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx        # 整体布局（侧边栏 + 内容区）
│   │   └── CategoryFormModal.tsx  # 共享的分类新增/编辑弹窗
│   ├── pages/                # 页面组件
│   │   ├── HomePage.tsx      # 首页/记一笔
│   │   ├── BillsPage.tsx     # 账单列表
│   │   ├── StatsPage.tsx     # 统计图表
│   │   ├── CategoriesPage.tsx # 分类管理
│   │   └── SettingsPage.tsx  # 设置（含 CSV/Excel 导出）
│   ├── db/                   # 数据库操作层
│   │   └── database.ts       # SQLite 增删改查
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/                # 工具函数
│       └── categories.ts     # 默认分类数据 + 重名校验
├── src-tauri/                # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs           # Rust 入口
│   │   └── lib.rs            # Tauri 配置（插件注册）
│   ├── capabilities/         # 权限配置
│   │   └── default.json
│   ├── Cargo.toml            # Rust 依赖
│   └── tauri.conf.json       # Tauri 配置
├── package.json
├── vite.config.ts
└── CLAUDE.md                 # 本文件
```

## 数据库设计

```sql
CREATE TABLE records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'expense' | 'income'
  amount REAL NOT NULL,         -- 金额（元）
  category_main TEXT NOT NULL,  -- 一级分类
  category_sub TEXT NOT NULL,   -- 二级分类
  date TEXT NOT NULL,           -- 日期 YYYY-MM-DD
  note TEXT DEFAULT '',         -- 备注
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
```

## 两级分类体系

### 支出分类
| 一级大类 | 二级小类 |
|---------|---------|
| 🍽️ 餐饮 | 早餐、午餐、晚餐、零食、饮品、聚餐 |
| 🚗 交通 | 公交、地铁、打车、加油、停车、火车/高铁、飞机 |
| 🛒 购物 | 日用品、数码产品、家居、书籍、化妆品 |
| 🏠 居住 | 房租/房贷、水电燃气、物业费、维修、清洁 |
| 🎮 娱乐 | 电影、游戏、旅游、运动健身、KTV、演出 |
| 💊 医疗 | 门诊、药品、体检、住院 |
| 📚 教育 | 学费、培训、书籍文具、考试 |
| 📱 通讯 | 话费、网费、快递 |
| 👗 服饰 | 衣服、鞋子、配饰、包包 |
| 📦 其他 | 礼物、捐赠、其他 |

### 收入分类
| 一级大类 |
|---------|
| 💰 工资、🧧 红包、📈 理财、💼 兼职、📦 其他收入 |

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发模式（前端热更新 + Tauri 窗口）
npx tauri dev

# 仅构建前端
npx vite build

# 仅构建 Rust 后端
cargo build --manifest-path src-tauri/Cargo.toml

# 构建发布包（安装包）
npx tauri build

# TypeScript 类型检查
npx tsc -b --noEmit
```

## 构建环境要求

- Node.js >= 18
- Rust（MSVC 工具链，Windows 需安装 Visual Studio Build Tools 含 C++ 工作负载）
- Windows 10+ 或 macOS 11+

### Windows 构建环境关键配置

编译 Rust 后端前需设置 MSVC 环境变量（路径中的版本号以实际安装为准）：

```bash
export MSVC_BIN="C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/<ver>/bin/Hostx64/x64"
export SDK_ROOT="C:/Program Files (x86)/Windows Kits/10"
export PATH="$PATH:$MSVC_BIN"
```

---

## 项目工作原则

> ⚠️ **以下原则在整个项目期间必须严格遵守：**

1. **所有技术决策必须提供方案选项**：用户不懂编程，任何涉及技术选择的事项，必须列出 2-3 个可行方案，用通俗语言解释各方案的优缺点，由用户做最终决定。不允许自行选择技术方案。

2. **分步开发、逐步验证**：每完成一个功能模块，让用户验证后再进行下一步。

3. **优先使用中文生态友好的库**：UI 组件库使用 Ant Design（中文文档完善）。

4. **保持简单**：第一版不做用户系统、云同步、预算管理等复杂功能。

5. **命令执行前需解释**：当用户对某个命令表示疑问时，必须先解释该命令的作用、影响和风险，等用户确认后再执行。
