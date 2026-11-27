---
title: "PhoneBox：把抽屉里的旧安卓手机改成电脑桌面控制台"
description: "开源工具 PhoneBox 用一台闲置安卓手机加一个桌面代理，做出系统监控、AI 会话、触控按键的桌面副屏。功能、场景、优缺点与安装方式评价。"
pubDate: 2026-11-27T12:05:27+08:00
tags: [效率工具, 开源软件, 工具]
---

![PhoneBox 在一块旧安卓手机上同时显示时钟、音乐播放与 CPU、GPU、内存、网络指标](/GitBoy/images/phonebox-old-android-desk-panel-review/01-phonebox-three-phones.jpg)

多数人的抽屉里都躺着一台退役的安卓手机：卖掉不值钱，留着只能当闹钟或电子相框，屏幕素质其实比很多桌面小副屏还好。另一边，想要一块随手能看的系统状态屏、一排能按的快捷键，就得去买 Stream Deck 之类的硬件，或者折腾一块小尺寸便携屏加树莓派。

**PhoneBox 是一套把这两件事接起来的开源工具：手机端装一个全屏 Android 应用，电脑端跑一个小体积代理程序，两者通过 USB 数据线或局域网 Wi-Fi 配对，把旧手机变成电脑的桌面控制面板。** 面板上可以放系统指标、进程、音乐控制、AI 编码会话、网页钩子和触控按键，布局在浏览器里拖拽编辑，数据来自本机，不需要账号，也不需要云服务。

> 本文依据 PhoneBox 官方 GitHub 仓库的 README、`docs/SETUP.md`、`docs/GUIDE.md`、`CHANGELOG.md` 与 v0.9.31（2026-11-27）的发布信息整理，属于资料型使用评价。笔者没有在自己的硬件上完成整套安装并逐项验证组件，因此文中涉及功能状态的部分以官方文档与发布说明为准，不用"实测"来表述未验证的结论。

## 一、核心功能

### 1. 桌面代理采集数据，手机端只负责显示

PhoneBox 是两个程序配合：电脑上是 .NET 10 写的桌面代理，手机上是 Kotlin 加 WebView 的全屏 Android 应用。代理把 CPU、内存、磁盘、网络、进程、媒体会话这些本机数据整理成接口，手机按当前页面订阅需要的那部分，所以面板本身很轻，重活都在电脑上干。

面板布局是一个 **12 × 6 的网格**，从官方给的 30 个模板起步，或者从空白页自己摆。每个组件可以单独设尺寸、字体、圆角、底色，也可以只给某一页、某一个组件做覆盖。页与页之间滑动切换，也可以用手机的音量键翻页，点底部的页点或者长按空白处能调出全部页面的总览，直接跳过去。

![PhoneBox 首页模板：时钟、天气、正在播放与四格硬件指标](/GitBoy/images/phonebox-old-android-desk-panel-review/02-phonebox-home-page.jpg)

### 2. 系统监控与进程管理

系统页是把任务管理器搬到了手机上：CPU、GPU、内存、磁盘、网络的曲线，加上 ping 与丢包。指标能拿到多少，取决于主机平台和装了什么辅助工具，官方给了一张很细的对照表：

- Windows：CPU、内存、网络、磁盘、ping 开箱就有；GPU 负载、显存、温度、功耗走系统计数器，NVIDIA 显卡额外用 `nvidia-smi` 补上功耗、风扇和频率；CPU 温度和 AMD / Intel 显卡的更多传感器要装 LibreHardwareMonitor 并打开它的 Web 服务器（默认读 `127.0.0.1:8085/data.json`，端口可以在设置里改）。
- Linux：CPU 温度走 hwmon，GPU 按 NVIDIA / AMD / Intel 分别从 `nvidia-smi`、`amdgpu`、`i915` 读取；CPU 功耗走 RAPL，但多数发行版只允许 root 读取。
- macOS：Apple silicon 的 GPU 占用从 IORegistry 读，温度、功耗、显存可能拿不到；Intel Mac 的支持更弱。

进程页列出占用最高的应用，点进去可以结束某一个实例或者全部实例。这个功能在排查"风扇为什么突然狂转"时比在电脑上开任务管理器快，前提是你人不在电脑前。

![PhoneBox 系统页：CPU、GPU、内存、磁盘与网络曲线](/GitBoy/images/phonebox-old-android-desk-panel-review/04-phonebox-system-stats.jpg)

### 3. AI 编码会话、配额与权限确认

这是 PhoneBox 最有辨识度的一块，也是它 2026 年 11 月上线后涨得很快的原因之一。面板上可以放几类东西：

- **配额**：Claude、Codex 的用量上限、重置时间，还有"按当前速度多久用满"的预测。
- **会话**：Claude Code、Codex、Cursor、OpenCode、Antigravity 的会话状态，能看到模型、耗时和 token 明细；同一个页面上还能并排放 GitHub 的待审 PR 和 CI 状态。
- **权限确认**：编码代理要执行命令、改文件、调 MCP 工具时，手机上弹出卡片，写着项目、工具和具体命令，两个按钮 **Allow** / **Deny**，点一下就把答复送回终端。

权限确认不是靠猜，而是给对应的代理装 hook。以 Claude Code 为例，`Install hook` 会往 `~/.claude/settings.json` 里写一个 `PermissionRequest` 钩子，并在旁边留一份 `settings.json.phonebox.bak` 备份；同时补几条 `PostToolUse`、`Stop`、`UserPromptSubmit`，这样在电脑上回答了，手机上的卡片会自己消失。Codex 写到 `~/.codex/hooks.json`，且新钩子需要在 `/hooks` 里手动信任一次。Cursor 没有专门的权限钩子，只能用 `beforeShellExecution` / `beforeMCPExecution`，代价是**每条**命令都会等手机点一下，所以默认关闭。

关键的一点是兜底：手机没连、没人答、超时，钩子就不返回决定，代理照常在终端里问。这属于设计上比较克制的做法，不会因为手机没电把工作流卡死。

![PhoneBox 会话页：编码代理的会话状态与 GitHub 待审 PR](/GitBoy/images/phonebox-old-android-desk-panel-review/03-phonebox-ai-sessions.jpg)

### 4. 触控按键与自动化

按键页是 Stream Deck 的软件版：应用和网址快捷方式、组合键、宏，加上音量、麦克风、媒体控制、OBS 场景切换。Control Deck 那套东西在 Windows 上最全，Linux 和 macOS 只有一部分——官方在 0.9.31 的更新里明确写了，应用混音器、麦克风、平衡、按键说话、设备切换这些**目前只有 Windows 有**，其它平台会直接标注，而不是给一个空列表。

自动化靠两条腿：**webhook** 和 **规则**。任何脚本都能 `POST` 一个值进来，面板上的"推送值""通知""新闻源"组件就跟着变；规则可以写成"CPU 温度连续 15 秒超过 85 °C 就切到系统页"这种形式（0.9.31 新增），也能对接 Home Assistant 的实体做开关。切页前会先倒数三秒并给"留下 / 现在切换"，用面板时不会被突然抢走画面。

另外还有一个 Trackpad 组件，把一格变成笔记本触控板，支持轻点、双指右键、拖拽和双指滚动。出于安全考虑，鼠标控制默认关闭，要在组件设置里勾选"允许从手机控制鼠标"才会生效；Linux 下 Wayland 会话会直接屏蔽合成鼠标事件。

![PhoneBox 的浏览器端布局编辑器：左侧页面列表，中间 12×6 网格预览，右侧组件设置](/GitBoy/images/phonebox-old-android-desk-panel-review/05-phonebox-layout-editor.jpg)

### 5. 连接方式与隐私边界

USB 连接不需要在局域网暴露任何东西：代理通过 `adb reverse` 在回环端口上通信，并像 Wi-Fi 一样做证书固定，密钥由手机端生成、代理通过 adb 读取。Wi-Fi **默认关闭**，打开后走 8766 端口的 HTTPS，同样校验固定证书和配对密钥；配对可以用二维码，二维码里只有电脑地址、证书指纹和一次性验证码（5 分钟有效、用一次失效），不含私钥。设置页面本身监听 `127.0.0.1:8765`，只在本机可访问。

官方声明 PhoneBox 本身没有遥测、分析或账号体系。会往外连的只有可选组件：天气走 Open-Meteo、汇率走 Frankfurter、加密货币走 CoinGecko、Hacker News 走官方 API，这些都不要 API key，断网时保留上一次的数据；代理还会去 GitHub 检查更新。手机没网时，这几类 HTTPS 数据源可以经 USB 走电脑的代理，但 Wi-Fi 下没有这个回退。想在外面用，官方文档给了 Tailscale 的做法。

## 二、适合哪些使用场景？

- **有闲置安卓手机（Android 5.0 及以上）：** 想让它在桌面上继续干活，而不是吃灰或当电子相框。
- **需要常看机器状态：** 跑渲染、编译、训练、挂下载，想抬眼就能看到 CPU、GPU、温度和网络，而不是切窗口开任务管理器。
- **重度使用编码代理：** 经常挂着 Claude Code、Codex 跑长任务，想在离开键盘时用手机批权限、看会话进度和配额剩余。
- **想要一块便宜的快捷键盘：** 需要一排能按的键（切场景、静音、开网址、跑脚本），但不想为此买硬件。
- **不想把数据交给云：** 所有指标和配置留在本机，接受"手机和电脑在同一张桌子或同一个局域网"这个前提。
- **有多台电脑：** 一台手机可以在配对的几台电脑之间切换，面板跟着换。

如果只是想要一块时钟加天气屏，或者你的手机是 iPhone 且不想自己用 Xcode 编译，那这套东西的投入产出比就不高——iOS 端目前只是实验性的 SwiftUI companion，没有发布包，也不支持安卓端的全部面板功能。

## 三、优点与注意事项

**优点**

1. **免费开源，MIT 许可证**，桌面端和安卓端都在同一个仓库里，没有付费档位或功能锁。
2. **不用 root、不用改机**：手机端就是一个普通 APK，靠 USB 调试或 Wi-Fi 配对连电脑，安卓 5.0 以上就能跑。
3. **数据留在本机**：无账号、无遥测，连接做证书固定，Wi-Fi 默认关闭，设置页面只绑回环地址——对这类"常驻桌面"的工具来说，这套默认值是对的。
4. **组件覆盖面很宽**：从系统指标、进程、媒体、日历、RSS，到 OBS、Docker 容器、Home Assistant、IP 摄像头（RTSP，由电脑上的 ffmpeg 拉流），基本能拼出自己想要的桌面仪表盘。
5. **更新极勤**：仓库 2026-11-07 建，到 11-27 的 v0.9.31 为止一共发了 48 个版本，20 天里几乎一天多一个，`CHANGELOG.md` 每条都带 issue 号和贡献者，维护节奏在个人项目里算罕见。
6. **文档相当完整**：安装、连接、组件、外观、Control Deck、Discord、隐私、开发各有独立文档，README 提供简体中文版。

**需要留意**

1. **版本号还在 0.9.x**，界面和组件会继续变。20 天涨到 7,300 多星也意味着需求涌入很快，遇到回归问题不算意外。
2. **Windows 发布包尚未签名**：官方说明 SignPath Foundation 已接受项目、测试签名通过，但在正式证书签发前，SmartScreen 和杀毒软件可能拦截，需要手动放行。装之前最好把 `setup.ps1` 或 `setup.sh` 读一遍——官方也是这么建议的。
3. **组件数量的官方口径不一致**：README 写"137 个组件、30 个模板"，而官方文档截图里编辑器的组件选择器显示"Search 41 widgets"。模板数量在文档里能一一对上，组件数量以安装后的实际选择器为准，别按宣传数字规划页面。
4. **平台能力差别很大**：GPU 温度、CPU 功耗、应用混音、麦克风控制这些在 Windows 上最全，macOS 上 Apple silicon 的 GPU 功耗与显存可能读不到；Linux 的 Wayland 会话会挡住 Trackpad 的鼠标控制，musl 发行版（如 Alpine）没有现成构建包。
5. **依赖外部工具**：`nowplaying-cli`（macOS）、`playerctl`（Linux）、LibreHardwareMonitor（Windows）、ffmpeg（摄像头）、`xdotool`（Linux 触控板）都要自己装，缺了对应组件就只是空着，不会报错解释原因。
6. **权限钩子会改配置文件**：安装 hook 会写 `~/.claude/settings.json`、`~/.codex/hooks.json`、`~/.cursor/hooks.json`。虽然都有备份，但在多账号、WSL 混用的环境里，建议先看清楚它会写哪几个文件再点。
7. **社区插件不受官方审查**：第三方 add-on 能通过 `PUT /api/settings` 改设置，权限等同于你自己，装之前得看代码。

## 四、安装方式

### Windows（10/11 x64，或 Windows 11 ARM64）

在普通 PowerShell 窗口里执行：

```powershell
irm https://raw.githubusercontent.com/ersinkoc/phonebox/main/setup.ps1 | iex
```

脚本会下载最新发布包、校验 SHA-256、提示安装缺失依赖、询问是否开机自启，最后打开 `http://127.0.0.1:8765` 的设置页。它也能顺便通过 USB 把安卓应用装到手机上。再跑一次同样的命令就是更新或修复，设置和配对关系会保留。

也可以用 Scoop：

```powershell
scoop bucket add phonebox https://github.com/ersinkoc/phonebox
scoop install main/adb phonebox/phonebox
```

### Linux 与 macOS

以当前用户身份运行，别用 sudo：

```sh
curl -fsSL https://raw.githubusercontent.com/ersinkoc/phonebox/main/setup.sh | bash
```

Linux 有 x64 和 ARM64（glibc）构建；macOS 分 Apple silicon 与 Intel。发布包里的代理自带 .NET 运行时，不需要另外装。

### 连接手机

- **USB**：手机打开「开发者选项 → USB 调试」，插数据线，在手机上同意授权。设置页里可以直接装 APK，连接后手机会自动亮屏并打开面板，之后还能通过 adb 更新应用。
- **Wi-Fi**：从 Releases 手动装 `PhoneBox-<版本>.apk`，在电脑设置页的 General 里打开「Let the phone connect without the USB cable」，保存后点顶部的 Restart，再点「Pair a phone over Wi-Fi」扫二维码配对。这条路不需要 adb，也不需要开发者选项。

安卓应用不在任何应用商店，只从仓库的 Releases 发布；iOS 端要从源码用 Xcode 编，没有现成包。

### 从源码构建

桌面代理需要 .NET 10；安卓端需要 JDK 17 与 Android SDK Platform 35（应用本身兼容 Android 5.0 / API 21）。只想看界面的话，仓库自带一个用模拟数据的预览服务：

```sh
python tools/demo-server.py
```

然后打开 `http://127.0.0.1:8790/panel/` 或 `/settings/`，不用连手机就能先试布局。官方也提供了浏览器里的在线演示站，可以先看再决定装不装。

## 五、综合评价

PhoneBox 抓住的是一个被忽略的存量：旧手机的性能足够驱动一块 1080p 面板，屏幕素质往往比几十块钱的桌面小屏好得多，缺的只是"谁来采数据、谁来传数据"这一层。它把这层做成了两个程序加一条 USB 线，剩下的事情交给可视化编辑器。

它真正拉开差距的地方不是组件多，而是三件事做得比较克制：一是**默认值偏向安全**——Wi-Fi 关着、鼠标控制关着、设置页面只绑回环、连接做证书固定；二是**兜底清楚**——手机不在线时编码代理照常在终端问你，不会被一个连不上的面板拖住；三是**不假装全平台一样**——文档逐项标出哪个平台缺什么，0.9.31 甚至专门把这些限制写进界面文案，而不是留一个空列表让人猜。

代价是它仍然很年轻：0.9.x 的版本号、未签名的 Windows 包、20 天涨七千星的节奏，都说明这还是个高速变化的项目。如果你的旧手机正好在抽屉里，电脑又常开，那试一次的成本只有一条数据线和十分钟；如果指望它当稳定生产力硬件、天天挂关键流程，建议等它到 1.0 并把签名补上再说。

**一句话评价：** 用一台闲置安卓手机加一个 MIT 许可的桌面代理，做出足够好用、默认值也足够保守的桌面控制台，功能覆盖远超预期，唯一要接受的是它还在 0.9.x 的快速迭代期。

---

*资料来源：*

- [PhoneBox 官方 GitHub 仓库](https://github.com/ersinkoc/phonebox)
- [PhoneBox 官方在线演示站](https://ersinkoc.github.io/phonebox/)
- [PhoneBox 官方 Releases（v0.9.31）](https://github.com/ersinkoc/phonebox/releases)
- [PhoneBox 安装与连接文档 docs/SETUP.md](https://github.com/ersinkoc/phonebox/blob/main/docs/SETUP.md)
- [PhoneBox 用户指南 docs/GUIDE.md](https://github.com/ersinkoc/phonebox/blob/main/docs/GUIDE.md)
- [PhoneBox 更新日志 CHANGELOG.md](https://github.com/ersinkoc/phonebox/blob/main/CHANGELOG.md)
- [PhoneBox 许可证（MIT）](https://github.com/ersinkoc/phonebox/blob/main/LICENSE)
