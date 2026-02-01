# AI Novel Studio (Nebula Write Local)

AI Novel Studio 是一个本地优先的智能小说写作辅助工具，结合了现代 Web 技术 (Vue 3 + Electron) 和强大的 AI 能力 (Google Gemini)，旨在为创作者提供安全、流畅且智能的写作体验。

## ✨ 核心特性

- **🔒 本地优先**: 数据完全存储在本地，保障创作隐私与安全。
- **🤖 AI 辅助**: 集成 Google Gemini AI，提供续写、润色、灵感激发等功能。
- **📝 结构化管理**: 
  - 支持 **长篇 (Long Novel)** 和 **短篇 (Short Novel)** 两种创作模式。
  - 自动管理卷 (Volume)、章 (Chapter)、节 (Section) 等层级结构。
- **🌍 世界观设定**: 独立的设定集管理 (角色、地点等)。
- **📂 智能文件管理**: 基于文件系统的直观管理，支持回收站功能。

## 🛠️ 技术栈

- **Frontend**: Vue 3, Vite, Tailwind CSS
- **Desktop**: Electron
- **Backend**: Python (FastAPI), Google GenAI SDK

## 🚀 快速开始

### 1. 环境要在

确保您的系统已安装以下环境：
- [Node.js](https://nodejs.org/) (推荐 LTS 版本)
- [Python 3.10+](https://www.python.org/)
- [Conda](https://docs.conda.io/en/latest/) (推荐用于 Python 环境管理)

### 2. 安装依赖

#### 后端环境 (Python)

```bash
# 创建并激活 Conda 环境
conda create -n ainovel python=3.10
conda activate ainovel

# 安装 Python 依赖
pip install -r backend/requirements.txt
```

#### 前端环境 (Node.js)

```bash
# 在项目根目录下运行
npm install
```

### 3. 配置

复制配置文件示例并设置 API Key：

```bash
cp env.example .env.local
```

打开 `.env.local` 并填入您的 Google Gemini API Key：
```ini
GEMINI_API_KEY=your_api_key_here
```

### 4. 运行项目

开发模式 (同时启动前端和 Electron)：
```bash
npm run dev
```

构建生产版本：
```bash
npm run electron:build
```

## 📂 项目结构

```text
localapp/
├── project.json         # 项目核心索引与元数据
├── backend/             # Python 后端服务 (AI 接口, 逻辑处理)
├── electron/            # Electron 主进程代码
├── src/                 # Vue 前端源代码
├── data/                # 应用数据 (预设, Regex等)
└── vector_db/           # 向量数据库 (本地 RAG 支持)
```

更多详细结构说明请参考 [structure.md](./structure.md)。

## 📄 License

[MIT](./LICENSE)
