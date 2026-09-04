# OFteenSSH - 本地 SSH 管理工具

<div align="center">

</div>

本项目是个人开发并使用的本地 SSH 管理桌面应用，项目内技术栈基于 Electron + Vue 3 + TypeScript 构建。借助了传统 SSH 管理桌面应用的安排布局，添加了更多现代化的功能，**该项目使用DeepSeek V4 Pro大模型协同开发**

---

<div align = "center">

<img title="" alt="OFteenSSH-LOGO" src="./build/icon.png" width="200">

---

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.5-42B883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-2.2-FFD859?logo=pinia&logoColor=black)
![SSH2](https://img.shields.io/badge/ssh2-1.15-0F0F0F)
![xterm.js](https://img.shields.io/badge/xterm.js-5.5-2F81F7)
![License](https://img.shields.io/badge/License-MIT-32CD32)

</div>

## 项目主要功能

- **安全 SSH 连接** - 支持密码认证和密钥认证，凭证安全存储
- **交互式终端** - 基于 **xterm.js**，支持 256 色、WebGL 渲染、链接检测
- **实时监控面板** - 连接状态、网速图表、内存/磁盘使用率、CPU负载、系统信息
- **自定义终端主题** - 可自定义颜色、字体、光标样式
- **断线自动重连** - 指数退避重连策略（最多6次）
- **凭证安全存储** - 使用系统密钥链加密存储密码

## 项目实现技术栈

| 技术                 | 用途          |
| ------------------ | ----------- |
| **Electron 33**    | 桌面应用框架      |
| **Vue 3**          | UI 渲染框架     |
| **TypeScript**     | 类型安全        |
| **ssh2**           | SSH 连接与命令执行 |
| **xterm.js**       | 终端渲染        |
| **ECharts**        | 网速图表        |
| **Pinia**          | 状态管理        |
| **electron-store** | 配置持久化       |

## 开发所使用的CLI指令

```bash
# 安装依赖
npm install --legacy-peer-deps

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 打包 Windows 安装程序
npm run build:win
```

## 项目结构

```
src/
├── main/           # Electron 主进程
│   ├── ssh/        # SSH 连接模块
│   ├── terminal/   # 终端模块
│   ├── monitor/    # 系统监控模块
│   ├── credential/ # 凭证安全存储
│   └── config/     # 应用配置
├── preload/        # Preload 脚本
├── renderer/       # Vue 3 渲染进程
│   ├── components/ # UI 组件
│   ├── stores/     # Pinia 状态管理（可自行替换）
│   ├── composables/# 组合式函数
│   └── config/     # 主题配置
└── shared/         # 主进程与渲染进程共享类型
```

## 使用方式

1. 启动应用后，点击左侧 **+** 按钮新建连接
2. 输入服务器地址、端口、用户名、认证方式
3. 选择内网或外网分组
4. 点击连接列表中的服务器名称建立 SSH 连接
