# CharView AI - 角色视图生成器

这是一个基于 Google Gemini 2.5 和 Photoroom API 的 Web 应用程序，专为角色设计和游戏开发工作流打造。

## 功能特性

1.  **自动抠图**: 使用 Photoroom API 自动去除背景，提取角色主体。
2.  **多视图生成**: 上传一张参考图，生成角色的三视图（左侧、背面、俯视等）。
3.  **表情生成**: 基于角色特写，生成大笑、生气、哭泣、惊恐、害怕等 5 种表情。
4.  **Q版化 (Chibi)**: 将正常比例的角色转换为可爱的 Q 版风格。

## 环境配置

在项目根目录下创建一个 `.env` 文件，并添加以下配置：

```env
# Google Gemini API Key (必需，用于生成视图和变体)
# 获取地址: https://aistudio.google.com/
API_KEY=your_gemini_api_key_here

# Photoroom API Key (必需，用于自动抠图功能)
# 获取地址: https://www.photoroom.com/api/
PHOTOROOM_API_KEY=your_photoroom_api_key_here

# 端口配置 (可选，默认为 3000)
PORT=3000
```

## 安装与启动

1.  **安装依赖**:
    ```bash
    npm install
    ```

2.  **启动开发服务器**:
    ```bash
    npm run dev
    ```
    默认访问地址: `http://localhost:3000`

3.  **局域网访问**:
    应用默认监听 `0.0.0.0`，同一局域网下的设备可以通过 `http://<本机IP>:<端口>` 访问。

    如果需要指定端口启动：
    ```bash
    # Linux/Mac
    PORT=8080 npm run dev

    # Windows (PowerShell)
    $env:PORT=8080; npm run dev
    ```

## 技术栈

*   **前端**: React, TypeScript, Tailwind CSS, Vite
*   **AI 模型**: Google Gemini 2.5 Flash Image
*   **图像处理**: Photoroom API

## 注意事项

*   使用 Gemini 生成图片时，建议上传清晰的全身照或半身照以获得最佳效果。
*   Photoroom API 需要付费额度，请确保 API Key 有效。
