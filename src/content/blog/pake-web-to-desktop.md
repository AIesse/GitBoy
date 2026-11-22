---
title: "Pake：一条命令把网页打包成轻量桌面应用"
description: "基于 Tauri、复用系统 WebView 的网页打包工具 Pake：核心功能、适用场景、限制与安装方式，附体积与许可的核对结果。"
pubDate: 2026-11-22T08:11:42+08:00
tags: [效率工具, macOS, 工具]
---

![用 Pake 打包的微信读书桌面端](/GitBoy/images/pake-web-to-desktop/01-pake-weread.jpg)

有些网站你每天都在用，却始终没有一个像样的桌面入口：打开浏览器、在几十个标签页里找回来、再被别的标签页打扰。Electron 时代的解决方案是给每个网站套一个 Chromium，代价是每一份安装包都上百兆，几套下来硬盘和内存都要还债。而浏览器自带的"安装为应用"又受限于浏览器自己的策略，图标、快捷键、托盘、窗口行为都不太由你决定。

**Pake 是一个用 Rust 与 Tauri 写的命令行工具，把任意网页地址（或本地静态站点目录）打包成 macOS、Windows、Linux 上的独立桌面应用。** 它不捆绑浏览器内核，页面交给操作系统自带的 WebView 渲染，因此安装包通常不到 10 MB，官方把它定位成 Nativefier 与各类 Electron 套壳方案的轻量替代。

> 本文依据 Pake 官方 GitHub 仓库、官方文档（CLI 使用说明、FAQ、高级用法）与 Releases 页面整理，核对时间为 2026-11-22，属于资料型使用评价，不是逐项实机测试。文中的体积、许可、版本号均以官方仓库与发布页为准；涉及运行时表现的描述，凡未亲自跑过的都会注明出处。

## 一、核心功能

### 1. 一条命令完成打包

最基本的用法只有两个参数：网址和应用名。

```bash
pnpm install -g pake-cli
pake https://github.com --name "GitHub"
```

不加 `--icon` 时，Pake 会自己去抓取网站图标并转成对应平台的格式（macOS 的 `.icns`、Windows 的 `.ico`、Linux 的 `.png`）。产物默认落在当前工作目录，macOS 默认生成 DMG，Windows 是 MSI，Linux 则按发行版给出 `.deb` 或 `.rpm`，再加一个 `.AppImage`。第一次构建要装环境、编 Rust，官方文档明确写了会慢，后续构建很快。

除网址之外，`[url]` 这个位置也接受本地 HTML 文件或一个带 `index.html` 的静态目录，比如前端项目构建出来的 `dist/`：

```bash
pake ./dist --name MyTool
```

这条能力常被忽略，但它意味着你可以把内部工具、离线文档站、甚至是自己写的单页应用，用同一套流程变成可分发的桌面程序。

### 2. 复用系统 WebView：体积的来源

Pake 的轻，来自一个干脆的决定：不带浏览器内核。macOS 上用 WKWebView，Windows 上用 WebView2，Linux 上用 WebKitGTK，Rust 那一侧只负责窗口、菜单、托盘和系统集成。

官方 Releases 里现成的安装包可以直接验证这一点。以最新一版 V3.20.0（2026-11-21 发布，代号 Keyring）为例，ChatGPT 的 macOS 安装包是 12.6 MB，Windows 的 MSI 只有 3.9 MB，Linux 的 `.deb` 是 5.3 MB。作为对照，一个自带 Chromium 的 Electron 应用通常要上百兆。

但这里有个必须说清的地方：同一版里的 Linux `.AppImage` 是 83.7 MB。AppImage 需要自带运行所需的库才能做到"拷过去就能跑"，体积自然回到另一个量级。所以"不到 10 MB"这个说法，对 DMG、MSI、DEB 成立，对 AppImage 不成立，挑分发格式时别把这句话当承诺。

![用 Pake 打包的 DeepSeek 桌面端](/GitBoy/images/pake-web-to-desktop/02-pake-deepseek.jpg)

### 3. 桌面化的细节：快捷键、托盘与窗口行为

如果只是套个壳，浏览器自己就能做。Pake 的价值更多在这些"差一点就不像原生应用"的地方：

- 窗口尺寸可控，`--width` 默认 1200，`--height` 默认 780，还支持 `--min-width` / `--min-height` 防止拖太小把布局挤坏；`--zoom` 可以设 50 到 200 的初始缩放。
- macOS 上 `--hide-title-bar` 做沉浸式标题栏；Windows 与 Linux 用 `--hide-window-decorations` 去掉原生边框，顶部留一条可拖拽区域，`F11` 切换全屏。
- `--show-system-tray` 常驻托盘，配合 `--start-to-tray` 可以启动就藏在托盘里；`--hide-on-close` 控制点关闭是隐藏窗口还是退出，macOS 默认隐藏，Windows/Linux 默认退出。
- `--activation-shortcut` 设全局唤起快捷键，`--always-on-top` 让窗口置顶，`--multi-instance` 允许同一个应用开多个实例。
- 内置一套导航快捷键：`⌘/Ctrl + [` 与 `]` 前进后退，`⌘/Ctrl + ↑ ↓` 滚到页首页尾，`⌘/Ctrl + L` 复制当前地址，`⌘/Ctrl + Shift + ⌫`（Windows 是 `Ctrl+Shift+Del`）清缓存重启。双击标题栏切换全屏。

这些参数单独看都很小，凑在一起才构成"这是一个应用"而不是"这是一个网页窗口"的观感差异。

### 4. 让网页"能用"的那些开关

把网页塞进 WebView，最常见的问题是登录、跳转和权限。Pake 为这几种情况都留了开关，官方 FAQ 里有明确说明：

- **跨域跳转**：默认只有应用自己的域名在窗口内打开，其余交给系统浏览器。`--safe-domain slack.com,okta.com` 可以把受信任域名及其子域都留在应用内，适合 SSO 回调；需要更细的控制就用 `--internal-url-regex`，正则优先于域名匹配。反过来，`--force-internal-navigation` 会把所有链接都关在窗口里。
- **登录态**：`--incognito` 用隐私模式运行，不写 cookie、localStorage 和浏览记录。官方特别点名微信网页版——它会检测 WebView 并写下阻止后续登录的标记 cookie，加 `--incognito` 可以绕过，代价是每次启动都要重新扫码。
- **权限**：`--camera` 与 `--microphone` 在 macOS 上给打包出来的应用加上摄像头、麦克风的 entitlement，视频会议和扫码类站点需要它。Windows 上的 `--password-autosave` 打开 WebView2 自带的密码保存提示，密码存在该应用自己的 WebView2 配置里，不与 Chrome、Edge 共享。
- **兼容性兜底**：站点挑 User-Agent 时用 `--user-agent` 伪装；功能还是不对，就用 `--inject ./fix.js` 注入一段脚本打补丁。Flutter Web 这类用到 WebAssembly 的站点要加 `--wasm`，它会补上跨源隔离所需的响应头。
- **记忆位置**：打包出来的应用默认记住上次关闭时的完整地址并在下次恢复，想每次从头开始就用 `--no-restore-last-url`——登录态仍然保留。

### 5. 面向批量与自动化

单个应用手敲命令还行，要做十个就得考虑可重复性。Pake 在这块给的东西比多数同类工具多：

- `--config app.json` 用一份 JSON 描述整个应用，字段有 schema 可查；`--json` 让命令输出机器可读的结果，方便脚本解析。
- 不想在本机装 Rust，可以用官方提供的 GitHub Actions 在线构建流程，把参数填进 workflow 就出安装包。
- 仓库里带 `llms.txt`，把完整的调用约定写给 AI agent 看，还提供了 Claude Code 与 Codex 的插件安装方式。这类设计在桌面打包工具里不常见，但确实降低了"让 agent 帮我打个包"的门槛。

平台相关的构建选项也算齐全：`--targets` 可以指定 `universal` / `apple` / `intel` 或 Linux 的 `deb`、`rpm`、`appimage`、`zst` 及其 arm64 变体；`--multi-arch` 打出 Intel 与 Apple Silicon 通吃的 macOS 包；Windows 上如果没装 Visual Studio Build Tools，可以用 `--windows-toolchain gnu` 走 MinGW/MSYS2。

![Pake 的工作链路：从网址到安装包](/GitBoy/images/pake-web-to-desktop/04-pake-pipeline.jpg)

## 二、适合哪些使用场景？

- **有一批常驻的网页工具**：在线文档、笔记、看板、IM 网页版、AI 对话站，希望它们像本地应用一样出现在 Dock 或任务栏，而不是混在浏览器标签里。
- **追求体积与内存的克制**：不想为了几个网页装 Electron 套壳，尤其是内存吃紧的旧机器或 8 GB 的轻薄本。
- **需要自定义外观与行为**：要自己的图标、固定窗口尺寸、全局快捷键、托盘常驻，而浏览器"安装为应用"给不了这些。
- **把内部系统变成可分发的客户端**：公司内网的管理后台、自建服务的面板，用一条命令包成客户端发给同事，不必教他们记网址。
- **本地静态页要个壳**：把构建产物 `dist/` 或单个 HTML 文件包装成桌面程序，用于演示、离线文档或小工具。
- **批量生产**：多套配置、CI 里构建、甚至交给 AI agent 执行。

反过来说，下面这些情况 Pake 不是好选择：依赖 Google OAuth 登录的站点、前面挡着 Cloudflare 人机验证的站点、需要 Widevine 之类 DRM 的流媒体，以及把内存占用当成硬指标的场合。

## 三、优点与注意事项

**优点**

- 安装包体积小得实在，DMG、MSI、DEB 都在 10 MB 上下，远小于捆绑内核的方案。
- 三平台一套命令，参数体系完整，窗口、托盘、快捷键、权限、导航策略都有对应开关。
- 支持本地静态站与 `dist` 目录，用途不限于"给网站套壳"。
- 自动化友好：配置文件、JSON 输出、Actions 在线构建、面向 agent 的 `llms.txt`。
- 许可清晰：GPL-3.0，另附 Pake Output Exception，明确用 Pake 打出来的应用归使用者所有、可自由分发。
- 维护活跃度可查：截至 2026-11-22，仓库 6.3 万余 star，最近一次提交在 2026-11-21，最新版本 V3.20.0 于同日发布。

**注意事项**

- **省的是安装包，不是内存。** 官方 FAQ 直接回答了这个问题：运行时内存由系统 WebView 和页面本身决定，重度 SPA 照样占几百 MB，Pake 这一侧没有能显著降低的开关。这是复用系统 WebView 的固有代价。
- **登录可能被上游拦。** Google 明确限制在嵌入式 WebView 里登录，官方把这条定性为 provider policy 而非打包 bug，遇到就只能换用浏览器或原生客户端。Cloudflare 人机验证也可能在非标准浏览器内核上死循环，官方说没有可靠的绕法。
- **跨平台渲染不完全一致。** 用系统 WebView 意味着 macOS、Windows、Linux 上的渲染引擎不同，同一页面在三个系统上的表现可能有差别。这不一定是坏事，但和 Electron"处处一致"是两条路。
- **Linux 侧坑最多。** AppImage 体积回到 80 MB 级；Arch 上还有上游 Tauri 的路径改写问题导致启动时找不到 `WebKitNetworkProcess`；Wayland 下可能遇到按钮和键盘失灵。官方 FAQ 收录了这些，说明是已知问题而不是个例。
- **本地打包的 SPA 路由有限制。** 官方文档写明 hash 路由开箱可用，history 模式的路由暂不支持。
- **首次构建有门槛。** 需要 Node ≥ 20.9 与 Rust ≥ 1.85，macOS/Linux 还要 `curl`、`wget`、`file`、`tar`。不装本地环境就得走 Actions 在线构建。
- **桌面版是另一条产品线。** 官网 pake.run 上的图形界面应用是独立下载的付费产品（页面标价一次性 $15.20，含 7 天退款、3 台设备，提供免费试用），命令行工具则完全免费开源。两者别混为一谈，`pnpm install -g pake-cli` 装到的只是 CLI。

## 四、安装方式

### 1. 装 CLI（推荐 pnpm）

```bash
pnpm install -g pake-cli
# 或者
npm install -g pake-cli
# 不想全局安装
npx pake-cli https://example.com --name Example
```

前提是 Node ≥ 20.9.0 与 Rust ≥ 1.85.0。Rust 缺失时 CLI 会询问是否代为安装；在非交互模式或 `--json` 模式下不会询问，而是直接以 `ENV_MISSING` 失败。

### 2. 打第一个包

```bash
# 最简用法，自动抓取网站图标
pake https://github.com --name "GitHub"

# 带窗口与外观参数
pake https://weekly.tw93.fun --name Weekly \
  --icon https://cdn.tw93.fun/pake/weekly.icns \
  --width 1200 --height 800 --hide-title-bar

# 托盘常驻 + 开调试工具
pake https://github.com --name "GitHub Desktop" \
  --width 1400 --height 900 --show-system-tray --debug
```

macOS 默认产出 DMG。想直接拿到 `.app` 方便测试，设置环境变量 `PAKE_CREATE_APP=1`；想直接装进 `/Applications`，用 `--install`。

### 3. 不装环境：用现成安装包或在线构建

Releases 页里已经有一批预打包的应用可以直接下载试用：微信读书、X、Grok、DeepSeek、ChatGPT、Gemini、YouTube、YouTube Music、Notion、Excalidraw、Flomo 等，每个都提供 macOS / Windows / Linux 三种格式。

![用 Pake 打包的 ChatGPT 桌面端](/GitBoy/images/pake-web-to-desktop/03-pake-chatgpt.jpg)

想打自己的包又不想配环境，就走官方的 GitHub Actions 在线构建流程。

### 4. 从源码开发

```bash
git clone https://github.com/tw93/Pake.git
cd Pake
pnpm i
pnpm run dev     # 本地开发，右键打开调试工具
pnpm run build   # 构建应用
```

样式定制、功能增强、容器通信这类深度改造，官方单独写了高级用法文档，不在 CLI 参数范围内。

## 五、综合评价

Pake 抓住的是一个很多人有、但一直被默认接受的不便：常用网站没有像样的桌面入口。它给出的答案不是"再造一个浏览器"，而是把系统已有的 WebView 借过来用，这一刀切下去，安装包从上百兆掉到几兆，同时保住了窗口、托盘、快捷键这些真正影响日常使用的东西。

它的克制也体现在边界上。官方文档不掩饰短板——Google 登录进不去、Cloudflare 验证会卡、内存省不下来、AppImage 反而更大，这些都以 FAQ 的形式写在仓库里，而不是留给你踩坑后发现。对一个六年迭代、6 万多 star 的项目来说，这种坦白比功能列表更值得信任。

选择它的前提是想清楚自己要什么。如果目标是"几个网页工具用起来更顺手、别占太多空间"，Pake 是当下最省事的一档；如果目标是"三端表现完全一致"或"跑 DRM 流媒体"，那套壳方案从原理上就不合适，换 Electron 或原生客户端更实际。另外提醒一句：GPL-3.0 加 Output Exception 意味着你打出来的应用可以自由分发，但如果你打算改 Pake 本身再做自己的产品，得按 GPL 的要求处理，官方也只是请求换个名字并注明来源。

**一句话评价：** 一个把"轻"做到位的网页打包工具，参数够全、边界写得够诚实，适合想把常用网站变成桌面应用又不想为此付出上百兆代价的人。

---

*资料来源：*

- [Pake 官方 GitHub 仓库](https://github.com/tw93/Pake)
- [Pake 官网](https://pake.run/)
- [Pake CLI 使用文档](https://github.com/tw93/Pake/blob/master/docs/cli-usage.md)
- [Pake 常见问题（FAQ）](https://github.com/tw93/Pake/blob/master/docs/faq.md)
- [Pake Releases 发布页](https://github.com/tw93/Pake/releases)
- [Pake 许可协议 GPL-3.0](https://github.com/tw93/Pake/blob/master/LICENSE)
