# NEBULA WRITE v0.2.2 Release Notes

- 发布日期：2026-02-17
- 对比区间：`v0.2.1...v0.2.2`
## 亮点更新

### 1) 新增 macOS 打包与发布支持
- `electron-builder` 增加 `mac` 目标（`dmg`、`zip`），并补充 macOS 对应的后端二进制资源映射。
- 新增 GitHub Actions 工作流 `.github/workflows/release-desktop.yml`：
  - 同时构建 macOS（x64 + arm64）与 Windows（x64）产物。
  - 自动上传 `.dmg` / `.zip` / `.exe` 并创建 GitHub Release。

### 2) 编辑器交互升级（正文 TXT 化 + 右键菜单）
- 正文编辑区改为纯文本编辑流程（不再走 Markdown 预览模式）。
- 为文本输入区域新增统一右键菜单能力：剪切、复制、粘贴、全选、AI 润色。
- AI Chat 输入框也接入同一套右键菜单（不包含润色项）。
- 新增组件与组合式逻辑：
  - `src/components/TextareaContextMenu.vue`
  - `src/composables/useTextareaContextMenu.ts`

### 3) UI 与可用性修复
- 修复宽屏场景下右侧 AI Chat Panel 溢出问题（侧栏与面板宽度约束调整）。
- 优化下拉组件长选项提示（悬浮 tooltip）。
- 编辑焦点与预览切换逻辑优化，减少误切换与状态错乱。

### 4) Electron 能力补充
- 新增剪贴板 IPC：
  - `clipboard:read-text`
  - `clipboard:write-text`
- 通过 `preload` 暴露 `window.electronAPI.clipboard` 给渲染进程统一调用。
