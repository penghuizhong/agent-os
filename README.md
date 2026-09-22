# NEXUS AI — Personal AI OS

一个多 Agent 协同的 AI 工作台前端应用，基于 Vue 3 + TypeScript + Tailwind CSS v4 构建，后端接入 [pi](https://github.com/earendil-works/pi) 作为 AI Agent 引擎。

## 功能特性

- **三栏式工作台布局**：左侧导航栏 + 中间活动流 + Agent 资料卡弹窗
- **多 Agent 管理**：7 个预设 AI Agent（Fashion Director、Trend Researcher、Design Creator 等），支持状态追踪（Working / Waiting / Offline）
- **Agent 资料卡**：点击左侧 Agent 弹出资料卡，支持弹窗 / 全屏切换，包含对话、任务、记忆、资料四个标签页
- **活动流时间线**：展示 Agent 完成的任务、待决策项、性能指标
- **实时 AI 对话**：通过 pi SDK 接入 LLM，支持多 Agent 角色化对话
- **个人中心下拉菜单**：个人主页、消息通知、会员订阅、设置、退出登录

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3.5 + TypeScript |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS v4 + 自定义暗色主题 |
| UI 组件 | shadcn-vue 模式（CVA 变体系统） |
| 图标库 | lucide-vue-next |
| 后端 | Express + pi SDK（`@earendil-works/pi-coding-agent`） |
| AI 引擎 | [pi](https://github.com/earendil-works/pi) |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

同时启动前端（http://localhost:5173）和后端（http://localhost:3001）。

### 配置 AI API Key（可选）

如需启用真实 AI 对话，设置 API Key 后重启后端：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# 或
export OPENAI_API_KEY=sk-...
```

未配置 Key 时，后端自动使用 mock 响应，前端功能正常可用。

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
agent-os/
├── src/
│   ├── components/
│   │   ├── layout/          # 布局组件
│   │   │   ├── LeftSidebar.vue      # 左侧导航 + Agent 列表 + 个人中心
│   │   │   ├── CenterPanel.vue      # 中间活动流
│   │   │   └── AgentProfileCard.vue # Agent 资料卡（弹窗/全屏）
│   │   └── ui/             # shadcn-vue 基础组件
│   │       ├── Button.vue
│   │       ├── Avatar.vue
│   │       ├── Badge.vue
│   │       ├── Card.vue
│   │       ├── Input.vue
│   │       ├── Textarea.vue
│   │       └── Tabs.vue
│   ├── stores/
│   │   └── app.ts           # 全局状态管理（Agent、活动流、聊天）
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── lib/
│   │   └── utils.ts         # 工具函数（cn、formatTimeAgo）
│   ├── App.vue              # 应用根组件
│   ├── main.ts              # 入口文件
│   └── style.css           # Tailwind + 主题变量
├── server/
│   └── src/
│       └── index.ts         # Express 后端 + pi SDK 集成
├── vite.config.ts            # Vite 配置 + API 代理
├── components.json           # shadcn-vue 配置
├── tsconfig.json
└── package.json
```

## 后端 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | 发送消息给指定 Agent，返回 AI 回复 |
| `/api/health` | GET | 健康检查，返回 pi 连接状态 |

请求示例：

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"1","message":"帮我分析2027春夏趋势"}'
```

## License

MIT
