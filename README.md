# Nebula Write

Nebula Write 是一个本地优先的桌面写作工具，使用 Vue 3 + Electron + FastAPI 构建，支持 AI 辅助创作、项目结构化管理与本地文件存储。

## 核心能力

- 本地优先：项目数据保存在本地目录。
- 多 Provider AI：当前支持
  - Google AI Studio
  - OpenAI Compatible
  - DeepSeek
- 创作模式：支持长篇/短篇结构化写作。
- Electron + Python 后端：桌面端启动并管理本地 FastAPI 服务。

## 技术栈

- 前端：Vue 3, Vite, TypeScript, Tailwind CSS
- 桌面端：Electron
- 后端：Python, FastAPI, google-genai, openai

## 环境要求

- Node.js LTS
- Python 3.10+

## 安装依赖

```bash
# Node 依赖（项目根目录）
npm install

# Python 依赖（建议在虚拟环境中）
pip install -r backend/requirements.txt
```

## Provider 配置


- 在应用内 AI 设置面板中选择 Provider 并保存 API Key。
- 可为不同 Provider 分别配置 API Base URL（如 OpenAI Compatible、DeepSeek）。
- 模型列表、连接状态会随 Provider 分别保存。
- OpenAI Compatible / DeepSeek 调用已切换为官方 OpenAI SDK（通过 `base_url` 指向兼容端点）。

## 开发运行

```bash
npm run dev
```

该命令会启动 Vite 与 Electron，并由 Electron 自动拉起后端。

## 构建与打包

```bash
# 前端构建（含 TypeScript 检查）
npm run build

# 构建 Python 后端可执行文件
npm run backend:build

# 完整桌面应用打包
npm run electron:build
```

### 关于 Python 环境（重要）

`backend:build` 当前使用：

```bash
python -m PyInstaller ...
```

这表示它会使用“当前终端里的 `python`”。  
如果你希望使用某个虚拟环境打包，请先激活该环境，再执行 `npm run backend:build` 或 `npm run electron:build`。

## 项目结构

```text
localapp/
├── src/                      # Vue 前端
├── electron/                 # Electron 主进程/预加载/IPC
├── backend/                  # FastAPI 与 Provider 服务
├── scripts/                  # 脚本化验证
├── data/                     # 本地数据（含 provider_settings.json 等）
└── package.json
```

## 常用验证

```bash
npm run build
python scripts/verify_api.py
python backend/check_health.py
```

## 版本更新

### 本版本已解决问题

-  AI 润色“选中段落插入”问题  
已修复选区润色后的插入/替换行为，确保插入位置、覆盖范围与用户选区严格一致。并在润色过程中高亮显示待润色区域

### 待解决问题（按优先级）

1. 短篇总纲拆分的可操作性与提示词优化  
增加拆分页面对分章节章纲的编辑功能，优化提示词生成更细节的结构化章纲。
2. ai对话历史拆分功能探讨  
是否要拆分ai对话历史，对每个节点维护单独的对话记录，以缓解长上下文下的注意力衰退问题
3. 提示词逻辑拆分与可视化配置  
将提示词从代码内的硬编码迁出，支持界面化编辑、导入、导出，便于优化提示词。
4. 设定集能力增强（RAG 或 MCP + 数据库）  
实现设定一致性、记忆增强与变量状态维护，支持跨章节长期上下文约束。
5. 实现长篇功能  
根据优化完毕的短篇逻辑实现长篇功能。

## License

MIT
