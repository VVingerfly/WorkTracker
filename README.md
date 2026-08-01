# WorkTracker

一个基于 React + Tauri 的离线工时管理应用，支持项目管理、任务追踪和工时统计。

## 功能特性

### 📊 仪表盘
- 查看任务概览，统计指标卡片（任务总数、总工时、已完成、进行中）
- 按时间范围、任务状态筛选
- 快捷新增任务和请假
- 任务状态、优先级、工时可直接编辑（状态改为完成时自动标注完成时间）
- 已完成任务默认隐藏

### 📁 项目管理
- 项目分组管理，点击分组名展开/折叠
- 项目状态管理（进行中、已交付、暂停、终止）
- 项目优先级管理与排序
- 任务列表（支持优先级、状态、工时编辑）
- 左侧侧边栏可折叠
- 按项目状态多选过滤

### 🛠️ 管理页面
- 项目分组、项目的增删改查
- 项目状态、优先级可直接在表格中编辑
- 按所属分组、状态等过滤和排序
- 所属分组按分组颜色显示标签

### ⚙️ 设置
- 统计周期配置（月周期、周周期）
- 优先级管理（自定义标签和颜色，拖拽排序）
- 任务状态管理（自定义标签和颜色）
- 项目状态管理（自定义标签和颜色）
- 请假类型管理
- 数据目录设置（可更改数据保存位置，支持打开目录）
- 数据备份与恢复

### 📈 统计报表
- 月视图/周视图切换，支持上月/下月、上周/下周导航
- 任务列表（按日期分组，可展开查看详情，非8小时标红）
- 项目汇总（按项目分组，展示周期内任务和工时统计）
- 工时统计

## 技术栈

- **前端**: React 18 + TypeScript + Ant Design 5
- **构建工具**: Vite 4
- **桌面框架**: Tauri 1.5
- **日期处理**: Day.js
- **Excel导出**: SheetJS (xlsx)

## 开发环境

### 前置依赖

- **Node.js**: >= 18.0.0
- **Rust**: >= 1.64.0（用于 Tauri 打包）
- **npm**: >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:1420 查看应用。

### 构建前端

```bash
npm run build
```

## 打包发布

### 一键打包脚本

项目提供了一键打包脚本，支持 Windows 平台：

#### PowerShell 脚本（推荐）

```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```

或者直接双击 `build.ps1` 文件运行。

#### 批处理脚本

```cmd
build.bat
```

### 发布到 GitHub Release

项目提供了 `release.ps1` 脚本，可一键完成打包并发布到 GitHub Release：

```powershell
# 使用 package.json 中的版本号
powershell -ExecutionPolicy Bypass -File release.ps1

# 指定版本号和发布说明
powershell -ExecutionPolicy Bypass -File release.ps1 -Version "0.2.0" -Notes "新增统计报表功能"
```

脚本会自动完成以下步骤：
1. 安装依赖、构建前端
2. 打包 Tauri 应用生成 exe 安装包
3. 创建并推送 Git Tag（如 `v0.1.0`）
4. 发布到 GitHub Release 并上传安装包

> **前提条件**：如需自动上传，需安装 [GitHub CLI](https://cli.github.com/) 并登录（`gh auth login`）。未安装时会输出手动上传的链接和文件路径。

### 手动打包步骤

1. **安装依赖**

```bash
npm install
```

2. **构建前端**

```bash
npm run build
```

3. **打包 Tauri 应用**

```bash
npm run tauri build
```

### 手动发布 Release

1. 更新 `package.json` 和 `src-tauri/tauri.conf.json` 中的 `version` 版本号
2. 运行打包脚本生成 exe
3. 创建并推送 tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

4. 打开 https://github.com/VVingerfly/WorkTracker/releases/new
5. 选择刚创建的 tag，填写标题和说明，拖入安装包文件：

```
src-tauri/target/release/bundle/nsis/WorkTracker_0.1.0_x64-setup.exe
```

6. 点击 "Publish release"

### 打包产物

打包成功后，产物位于以下目录：

```
src-tauri/target/release/bundle/
└── nsis/
    ├── WorkTracker_0.1.0_x64-setup.exe   # Windows 安装程序
    └── WorkTracker_0.1.0_x64-setup.nsis  # NSIS 脚本
```

### 图标更新

应用图标位于 `src-tauri/icons/` 目录下。如需更换图标：

1. 准备一张 512×512 的 PNG 图片作为源图标，放在 `src-tauri/` 目录下（如 `app-icon.png`）
2. 运行命令生成所有尺寸的图标：

```bash
npx tauri icon src-tauri/app-icon.png
```

该命令会自动生成以下图标文件：
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `icon.png` - PNG 图标（多个尺寸）
- `StoreLogo.png`, `Square*Logo.png` - Windows Store 图标

3. 重新打包应用即可生效。

### Tauri 配置说明

- **应用名称**: WorkTracker
- **窗口尺寸**: 1200 × 800
- **数据存储**: `%APPDATA%/com.worktracker.app/`
- **打包目标**: NSIS（Windows 安装程序）

## 数据存储

应用数据存储在用户目录下：

- **Windows**: `C:\Users\<用户名>\AppData\Roaming\com.worktracker.app\`

包含文件：
- `config.json` - 应用配置
- `projects.json` - 项目数据
- `tasks.json` - 任务数据
- `leave.json` - 请假数据

## 统计周期

- **月周期**: 默认上个月26日至本月25日
- **周周期**: 默认上周四至本周三

可在设置页面自定义周期配置。

## 许可证

MIT License

## 项目结构

```
WorkTracker/
├── src/                    # 前端源代码
│   ├── pages/              # 页面组件
│   ├── services/           # 数据服务
│   ├── types/              # TypeScript 类型定义
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri 后端代码
│   ├── src/                # Rust 源代码
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置
├── build.bat               # Windows 批处理打包脚本
├── build.ps1               # Windows PowerShell 打包脚本
├── release.ps1             # 发布到 GitHub Release 脚本
├── package.json            # 前端依赖配置
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```
