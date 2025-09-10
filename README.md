# AI Chat Chrome 插件：技术文档

## 1. 项目概述

这是一个功能丰富的 Google Chrome 浏览器扩展程序，旨在提供一个集成的 AI 聊天界面。它支持与多个大型语言模型（LLM）提供商（如 Google Gemini、OpenAI 和 Cerebras）进行交互，并提供对话历史管理、Markdown 渲染、文件/图片上传以及消息操作（复制、导出 PDF）等功能。

## 2. 技术栈

本项目采用现代前端技术栈构建，以确保高性能、可维护性和良好的用户体验。

*   **核心框架**：
    *   **React 18+**：用于构建响应式和组件化的用户界面。
    *   **TypeScript**：为 JavaScript 提供了静态类型检查，增强了代码的健壮性和可维护性。
*   **构建工具**：
    *   **Vite**：一个现代化前端构建工具，提供极速的开发服务器和优化的生产打包，特别适合 Chrome 扩展程序的开发。
*   **UI 库**：
    *   **Material-UI (MUI)**：一个基于 Material Design 的 React UI 组件库，提供了大量预构建的、美观且可定制的组件，加速了 UI 开发并确保了视觉一致性。
*   **功能库**：
    *   **`react-markdown`**：用于将 Markdown 格式的文本渲染为 React 组件。
    *   **`rehype-highlight`**：`react-markdown` 的插件，用于代码块的语法高亮。
    *   **`highlight.js`**：提供多种代码高亮主题。
    *   **`html2canvas`**：将 DOM 元素渲染为 `<canvas>` 图像，用于 PDF 导出。
    *   **`jspdf`**：一个客户端 JavaScript 库，用于生成 PDF 文件。
*   **Chrome API**：
    *   **`chrome.storage.sync`**：用于持久化存储用户设置和对话历史，并自动在用户设备间同步。
    *   **`chrome.tabs`**：用于在新标签页中打开聊天界面。
    *   **`chrome.action`**：监听浏览器工具栏图标的点击事件。
    *   **`chrome.runtime`**：用于打开扩展程序的选项页面。

## 3. 项目结构

项目的目录结构清晰，遵循模块化原则，便于开发和维护。

```
ai-chat-extension/
├── public/                 # 静态资源和 Chrome 扩展程序清单文件
│   ├── icon16.png          # 插件图标 (16x16)
│   ├── icon48.png          # 插件图标 (48x48)
│   └── manifest.json       # Chrome 扩展程序的核心配置文件
├── src/                    # 源代码目录
│   ├── components/         # 可复用的 React UI 组件
│   │   └── ChatMessage.tsx # 单条聊天消息的渲染组件
│   ├── pages/              # 扩展程序的不同页面组件
│   │   ├── Options.tsx     # 插件的设置/选项页面
│   │   └── Popup.tsx       # 插件的主聊天界面 (在新标签页中打开)
│   ├── services/           # 业务逻辑和 API 交互服务
│   │   ├── api.ts          # 负责与 LLM API 交互的核心逻辑
│   │   └── types.ts        # 项目中共享的 TypeScript 类型定义
│   ├── background.ts       # 扩展程序的后台 Service Worker 脚本
│   ├── main.tsx            # 主聊天界面的入口文件
│   └── options.tsx         # 设置页面的入口文件
├── index.html              # 主聊天界面的 HTML 模板
├── options.html            # 设置页面的 HTML 模板
├── package.json            # 项目依赖和脚本配置
├── tsconfig.json           # TypeScript 根配置
├── tsconfig.app.json       # 应用程序相关的 TypeScript 配置
├── tsconfig.node.json      # Node.js 环境相关的 TypeScript 配置
└── vite.config.ts          # Vite 构建工具的配置文件
```

## 4. 关键文件及其作用

*   **`public/manifest.json`**：
    *   扩展程序的“身份证”，定义了名称、版本、权限、图标、入口点等。
    *   `"manifest_version": 3`：使用最新的 Manifest V3 规范。
    *   `"permissions": ["storage"]`：声明需要访问 `chrome.storage` API。
    *   `"action"`：定义了浏览器工具栏图标的行为，但没有 `default_popup`，因为聊天界面在新标签页打开。
    *   `"background": { "service_worker": "background.js" }`：指定后台脚本，用于监听图标点击事件。
    *   `"options_page": "options.html"`：指定设置页面的入口。

*   **`vite.config.ts`**：
    *   Vite 的核心配置文件，定义了如何构建项目。
    *   `plugins: [react()]`：启用 React 插件。
    *   `build.rollupOptions.input`：定义了多个入口点 (`index.html` 用于聊天界面，`options.html` 用于设置页面，`src/background.ts` 用于后台脚本)。
    *   `build.rollupOptions.output`：配置了输出文件的命名规则，特别是确保 `background.ts` 被打包为 `background.js` 并位于 `dist` 根目录，以符合 `manifest.json` 的要求。

*   **`src/background.ts`**：
    *   扩展程序的后台 Service Worker。
    *   监听 `chrome.action.onClicked` 事件（即点击浏览器工具栏上的插件图标）。
    *   当事件触发时，使用 `chrome.tabs.create({ url: 'index.html' })` 在新标签页中打开主聊天界面。

*   **`src/pages/Popup.tsx`**：
    *   主聊天界面的 React 组件。
    *   **状态管理**：使用 `useState` 管理聊天消息 (`messages`)、用户输入 (`input`)、加载状态 (`isLoading`)、选中的文件 (`selectedFile`)、图片预览 (`imagePreviewUrl`)。
    *   **对话管理**：管理对话列表 (`conversations`) 和当前对话 ID (`currentConversationId`)。
    *   **`useEffect`**：用于在组件挂载时加载对话历史，并在消息更新时保存对话到 `chrome.storage.sync`。
    *   **UI 布局**：包含聊天消息区域、输入框、发送按钮、文件上传按钮、API 提供商选择器、对话列表抽屉、设置按钮和删除当前对话按钮。
    *   **`handleSend`**：处理消息发送逻辑，包括文本和图片数据的读取、消息的构建、调用 `api.ts` 中的 `sendMessage` 函数。
    *   **对话操作**：`handleNewChat`、`handleLoadChat`、`handleDeleteChat` 等函数。

*   **`src/pages/Options.tsx`**：
    *   插件的设置页面 React 组件。
    *   使用 `useState` 管理 Gemini、OpenAI 和 Cerebras 的 API Key、Base URL 和 Model 配置。
    *   **`useEffect`**：在组件挂载时从 `chrome.storage.sync` 加载已保存的设置。
    *   **`handleSave`**：将表单中的配置保存到 `chrome.storage.sync`。
    *   **UI 布局**：使用 Material-UI 的 `TextField` 和 `Button` 构建配置表单。

*   **`src/services/api.ts`**：
    *   核心 API 交互逻辑。
    *   `sendMessage` 函数：根据传入的 `provider`（Gemini, OpenAI, Cerebras）和 `messages`（可能包含图片数据），构建并发送 HTTP 请求到相应的 LLM API。
    *   **多模态支持**：内部包含 `transformMessagesForGemini` 和 `transformMessagesForOpenAIVision` 辅助函数，用于将内部 `Message` 结构转换为各 API 所需的特定请求体格式。
    *   处理 API 响应和错误。

*   **`src/services/types.ts`**：
    *   定义了项目中所有共享的 TypeScript 接口和类型，如 `ApiConfig`、`AllSettings`、`Message`、`MessagePart`、`ApiProvider`、`ConversationMetadata` 和 `Conversation`。这确保了整个代码库的类型一致性和安全性。

## 5. 配置

插件的 API 配置通过其独立的“选项”页面进行。

1.  **访问选项页面**：
    *   右键点击浏览器工具栏上的插件图标，选择“选项”。
    *   或者，在聊天界面中点击右上角的“设置”图标。
2.  **输入配置**：在页面中，您可以为 Gemini、OpenAI 和 Cerebras 分别输入 API Key、Base URL 和 Model 名称。
    *   **API Key**：您的 LLM 服务提供商的认证密钥。
    *   **Base URL**：API 的基础地址（例如，OpenAI 默认为 `https://api.openai.com/v1`，Cerebras 默认为 `https://api.cerebras.ai/v1`）。
    *   **Model**：您希望使用的具体模型名称（例如，Gemini 的 `gemini-pro`，OpenAI 的 `gpt-3.5-turbo` 或 `gpt-4-vision-preview`，Cerebras 的 `gpt-oss-120b`）。
3.  **保存**：点击“Save Settings”按钮，配置将自动保存并持久化。

## 6. 打包与使用

### 6.1 打包项目

在项目根目录下，执行以下命令来构建生产就绪的扩展程序：

```bash
npm install   # 如果是首次运行或依赖有更新，请先安装依赖
npm run build # 执行 TypeScript 编译和 Vite 打包
```

*   `npm install`：安装 `package.json` 中定义的所有项目依赖。
*   `npm run build`：这个脚本会首先运行 `tsc -b` 进行 TypeScript 编译，然后运行 `vite build` 进行代码打包和优化。
*   打包成功后，所有生成的文件将位于项目根目录下的 `dist/` 文件夹中。

### 6.2 在 Chrome 浏览器中加载扩展程序

1.  **打开扩展程序管理页面**：
    *   在 Chrome 浏览器中打开新标签页，输入 `chrome://extensions` 并回车。
    *   或者，点击浏览器右上角的三个点菜单 -> 更多工具 -> 扩展程序。
2.  **启用开发者模式**：在扩展程序管理页面的右上角，打开“开发者模式”开关。
3.  **加载已解压的扩展程序**：
    *   点击页面左上角的“加载已解压的扩展程序”按钮。
    *   在弹出的文件选择对话框中，导航到您的项目目录，并选择 `dist/` 文件夹。
4.  **完成加载**：扩展程序将被加载，您应该能在浏览器工具栏上看到它的图标（一个灰色方块）。

### 6.3 使用扩展程序

1.  **打开聊天界面**：点击浏览器工具栏上的插件图标。聊天界面将在一个新的浏览器标签页中打开。
2.  **配置 API**：
    *   在聊天界面中，点击右上角的“设置”图标。
    *   在打开的设置页面中，输入您的 LLM API 配置，并点击“Save Settings”。
3.  **开始聊天**：
    *   在聊天界面左上角的下拉菜单中选择您要使用的 AI 提供商。
    *   在底部的输入框中输入您的消息。
    *   点击右侧的“发送”按钮，或按回车键发送消息。
    *   您也可以点击输入框左侧的“回形针”图标上传图片。
4.  **管理对话**：
    *   点击左上角的“三条杠”菜单图标，可以打开对话列表侧边栏。
    *   在侧边栏中，您可以点击“+”号新建对话，点击列表项加载历史对话。
    *   点击聊天界面右上角的“垃圾桶”图标可以删除当前对话。
5.  **消息操作**：
    *   对于 AI 的回复，将鼠标悬停在消息气泡上，左下角会出现“复制”和“下载 PDF”图标。

---