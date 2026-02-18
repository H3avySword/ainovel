# STRUCTURE

本文档定义当前仓库的目录组织与职责边界。

## 1. 顶层目录

```text
repo/
  src/
  tests/
  configs/
  .github/
  data/
  dist/
  docs/
  package.json
  README.md
  STRUCTURE.md
```

- `src/`：生产代码。
- `tests/`：所有自动化测试。
- `configs/`：测试框架配置。
- `.github/workflows/`：CI、nightly、release 工作流。

## 2. 源码目录 `src/`

```text
src/
  electron/
    main/
      main.js
      FileManager.js
      runtimeConfig.js
      ipc/
      services/
    preload/
      preload.js
  renderer/
    main.ts
    App.vue
    components/
    composables/
    services/
    types.ts
    electron-api.d.ts
  python_backend/
    main.py
    models.py
    routers/
    services/
    requirements.txt
    requirements-dev.txt
```

### 2.1 Electron

- `src/electron/main/`：主进程逻辑、IPC 注册、项目持久化。
- `src/electron/preload/`：`window.electronAPI` 桥接。

### 2.2 Renderer

- `src/renderer/`：Vue 前端，包含页面、组件与前端服务层。

### 2.3 Python Backend

- `src/python_backend/`：FastAPI 应用、路由、Provider 适配层、运行与开发依赖。

## 3. 测试目录 `tests/`

```text
tests/
  electron/
    unit/
    integration/
    setup.ts
  renderer/
    unit/
    component/
    integration/
    setup.ts
    setup.component.ts
  backend/
    unit/
    integration/
    contract/
    conftest.py
  e2e/
    ui/
    system/
    fixtures/
    utils/
```

- `tests/electron/unit`：主进程纯逻辑单元测试。
- `tests/electron/integration`：IPC/服务协作测试。
- `tests/renderer/unit`：前端服务函数单元测试。
- `tests/renderer/component`：Vue 组件交互测试。
- `tests/backend/unit`：后端函数与模块测试。
- `tests/backend/integration`：FastAPI 路由/中间件测试。
- `tests/backend/contract`：对外协议/在线冒烟（live）测试。
- `tests/e2e/ui`：Web UI 流程测试。
- `tests/e2e/system`：Electron 系统层启动/重启/落盘流程测试。

## 4. 配置目录 `configs/`

```text
configs/
  playwright/
    playwright.config.ts
  vitest/
    vitest.config.ts
    vitest.unit.config.ts
    vitest.component.config.ts
    vitest.electron.config.ts
  python/
    pytest.ini
```

- `configs/vitest/*`：前端/Electron Vitest 配置。
- `configs/playwright/playwright.config.ts`：E2E 配置。
- `configs/python/pytest.ini`：pytest 路径、marker、默认选项。

## 5. 命令与路径约定

- Electron 入口：`src/electron/main/main.js`
- Vite 入口：`src/renderer/main.ts`
- Python 入口：`src/python_backend/main.py`
- 快速测试：`npm run test:fast`
- Python 测试：`python -m pytest -c configs/python/pytest.ini tests/backend -q -m "not live"`

## 6. 迁移兼容原则

- 不变更现有 IPC channel 名称与返回 envelope。
- 不变更 FastAPI 对外字段语义。
- 测试目录与配置目录统一集中，避免散落在业务源码目录。
