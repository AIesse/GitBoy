---
title: "VirtualBuddy：在 Apple 芯片 Mac 上跑 macOS 与 Linux 虚拟机"
description: "开源虚拟机管理器 VirtualBuddy 的功能、适用场景、优缺点与安装方式，涵盖 vbctl 命令行与 Service Tunnel。"
pubDate: 2026-11-27T08:19:29+08:00
tags: [macOS, 开源软件, 工具]
---

![VirtualBuddy 同时运行多台 macOS 虚拟机，前台是虚拟机设置面板](/GitBoy/images/virtualbuddy-macos-vm-review/01-showcase.jpg)

想试一个新版本 macOS 的 beta，或者确认自己的应用在旧系统上还能不能跑，最直接的办法是装一台虚拟机。但真做起来，麻烦往往不在虚拟机本身：装哪套系统、镜像从哪来、装完怎么把文件传进去、剪贴板为什么不能复制、开发服务器怎么让宿主机访问到，每一步都要单独查一遍文档。对只需要一个干净测试环境的人来说，这些准备工作比测试本身更费时间。

**VirtualBuddy** 是一款开源 macOS 应用，用 Apple 官方的 Virtualization.framework 在 Apple 芯片 Mac 上创建和管理 macOS 与 ARM64 Linux 虚拟机。它把镜像下载、安装向导、虚拟机设置、共享目录、剪贴板、端口隧道和命令行控制收进一个应用，目标是让人装完就能开始测试，而不是先折腾一圈虚拟化配置。

> 本文依据 VirtualBuddy 官方 README、仓库 Documentation 目录下的命令行与隧道文档、GitHub Releases 发布说明整理，属于资料型评价。文中命令、参数、版本要求均摘自官方文档，未在真机上逐项实测；功能状态以官方仓库为准。

## 一、核心功能

### 1. 一条安装向导装完 macOS 或 Linux

在虚拟机库里点 **+**，先选 macOS 还是 Linux，然后从三个来源里挑一个：官方维护的版本清单直接下载、填一个自定义下载地址、或者打开本地已有的镜像文件。macOS 用 IPSW 恢复映像，Linux 用 ARM64 的 ISO。

清单里会标注每个版本对宿主机的额外要求。官方 README 举了个具体例子：用 IPSW 安装 macOS 27 Golden Gate 需要宿主机运行 macOS 26 或更高，并且具备相应的设备支持；部分较新的 macOS 恢复映像需要宿主机装了匹配版本的 Xcode，有时还要单独下载 Apple Developer 的设备支持包。已经在用的虚拟机想升级系统，直接在客户机的「系统设置 → 通用 → 软件更新」里升，不用重装。

![VirtualBuddy 的四层结构：图形界面、vbctl、Guest 应用都落在同一套官方虚拟化框架上](/GitBoy/images/virtualbuddy-macos-vm-review/03-structure.jpg)

### 2. 虚拟机设置：从 CPU 核数到网络模式

每台虚拟机都能单独配置 CPU 核数、内存、存储、显示器和网络。网络支持 NAT 与桥接两种模式。设置面板里还有「自动配置显示器分辨率」这类省事选项，官方标注只对运行 macOS 14 及以上的虚拟机生效，且需要客户机识别到显示器。

从 2.3 Beta 1 开始，部分设置可以在虚拟机运行时改：共享目录可以随时增删，分辨率也能直接调。其中 macOS 虚拟机在运行中改分辨率，要求宿主机和客户机都在 macOS 14 或以上。

### 3. VirtualBuddyGuest：剪贴板与共享目录

VirtualBuddyGuest 是装在客户机里的配套应用。虚拟机启用它之后，启动时会自动挂载一个磁盘映像，在客户机的 Finder 侧边栏里能看到名为 Guest 的磁盘，双击里面的 VirtualBuddyGuest 即可安装。

![客户机里的 Guest 磁盘与 VirtualBuddyGuest，右侧显示共享目录已连接](/GitBoy/images/virtualbuddy-macos-vm-review/02-guest-app.jpg)

版本差异要留意：当前的 Guest 应用要求客户机 macOS 14 或以上，提供剪贴板共享和共享目录自动挂载；macOS 13 只能用旧版 Guest 应用，只能自动挂载共享目录；macOS 12 的客户机则完全不装 Guest 应用，共享目录得靠虚拟机网络走 macOS 自带的文件共享。不想装 Guest 应用时，也可以在客户机终端里手动挂载：

```bash
mkdir -p ~/Desktop/VirtualBuddyShared && mount -t virtiofs VirtualBuddyShared ~/Desktop/VirtualBuddyShared
```

另外两项实用能力：支持保存并恢复虚拟机状态（官方标注 macOS 14 及以上），以及右键「复制」一台虚拟机。在 APFS 上，两份副本初始阶段共享磁盘空间，所以可以留一份干净的基线，用副本去做测试。当宿主机与客户机都在 macOS 27 或以上时，还能把 USB 设备直通给虚拟机，并自动创建第一个用户账号跳过设置助理。

### 4. Service Tunnel：虚拟机不联网也能连服务

Service Tunnel 用来打通宿主机和客户机之间的单个端口。两个方向都支持：既能把客户机里的开发服务器开到宿主机的 `localhost`，也能让客户机访问宿主机上的数据库。官方文档明确写了，即使虚拟机的网络适配器关掉，隧道依然可用——这对一台只用来跑测试、不希望它接触外网的系统很合适。

![Service Tunnel 的两个方向：宿主机端口映射到客户机服务，反向同理](/GitBoy/images/virtualbuddy-macos-vm-review/04-service-tunnels.jpg)

配置在虚拟机设置的 Service Tunnels 里，两端各自选 TCP 端口或 Unix socket 路径即可。默认情况下，凡是客户机发起的隧道请求都要在宿主机上人工审核；审核强度可以在「设置 → 安全 → Tunnel review」里改成 Every Change、New Tunnels Only 或 Never。官方对这种放宽讲得很直白：选 Never 等于允许客户机里任何程序连上宿主机任意服务。把虚拟机从别的 Mac 拷过来时，隧道也要重新点一次「Approve Tunnels」。

### 5. vbctl：把虚拟机操作写进脚本

命令行工具默认是关的。打开「VirtualBuddy → 设置 → 安全」，点 Unlock，打开「允许 vbctl 控制 VirtualBuddy」，再点安装，工具会被链接到 `PATH` 里已有且可写的目录，比如 `/opt/homebrew/bin`、`/usr/local/bin`、`~/.local/bin`。不想安装也可以直接从应用包里跑：`/Applications/VirtualBuddy.app/Contents/MacOS/vbctl --help`。

日常用法基本是这一组：

```bash
vbctl list                              # 列出所有虚拟机和状态
vbctl start Sequoia --wait-for-guest    # 启动并等 Guest 应用连上
vbctl guest appearance Sequoia dark     # 把客户机切到深色模式
vbctl tunnel add Sequoia host:8080 guest:3000
vbctl display Sequoia --size 2560x1440
vbctl stop Sequoia --wait
```

脚本化时加 `--json` 拿结构化输出，加 `--quiet` 去掉进度提示，`--timeout` 限制等待时间。退出码是按语义分的：3 表示命令行访问没开或连不上应用，4 表示名字没匹配上或匹配到多个，5 是虚拟机状态不对，6 是 Guest 应用未连接，8 表示需要人工审核。写 CI 或自动化脚本时，这比只判断成功失败有用得多。

## 二、适合哪些使用场景？

- **测试 macOS beta：** 想试新系统又不想动主力机，装一台虚拟机，坏了直接删。
- **验证应用兼容性：** 需要覆盖多个 macOS 版本时，用虚拟机库并排放几台，比双系统切换省事。
- **从 Xcode 里直接跑虚拟机：** 官方说明从 `main` 分支构建的开发版带实验性支持，可以在 Xcode 里把 Mac 应用运行和调试在虚拟机中。
- **需要干净的一次性环境：** 复制一台基线虚拟机，测完丢弃，APFS 上还不占额外空间。
- **在 Mac 上跑 ARM64 Linux：** 用 ISO 装 Ubuntu Desktop 或 Server 做开发与验证。
- **需要脚本化控制：** 批处理启停虚拟机、切显示分辨率、开隧道，用 vbctl 而不是点鼠标。
- **隔离但不完全断网的环境：** 关掉虚拟机网络，只留一条隧道通到需要的服务。

如果只是偶尔跑一个 Linux 命令，容器或者远程服务器可能更轻；VirtualBuddy 的价值在「完整的 Mac 系统环境」和「图形界面可交互」，不是替代 Docker。

## 三、优点与注意事项

**优点**

1. 免费开源，许可证是 BSD-2-Clause，源码完整；官方也提供 Gumroad 购买与 GitHub Sponsors 两条支持渠道，不影响免费使用。
2. 走 Apple 官方 Virtualization.framework，不依赖第三方 hypervisor，架构上跟着系统走。
3. 流程闭环：镜像下载、安装、共享目录、剪贴板、端口隧道、命令行控制都在一个应用里，不用拼装多个工具。
4. 命令行做得认真：`--json`、超时、语义化退出码、shell 补全脚本都有，适合写自动化。
5. 安全默认值保守：vbctl 默认关闭，开它要 Touch ID 或账号密码；隧道默认逐条审核。
6. 维护活跃：仓库 9,029 星，最新发布是 2.3 Beta 1（2026-11-18），稳定版 2.2.1 在 2026-10-19，仓库最近一次提交在 2026-11-26。

**需要留意**

1. 硬件门槛硬：必须是 Apple 芯片的 Mac，且宿主机要 macOS 14 Sonoma 或以上，Intel Mac 用不了。
2. 客户机系统版本有下限：macOS 12 Monterey 起，更老的系统不支持。
3. 最新发布是 Beta 版（2.3 Beta 1），稳定版仍是 2.2.1；想稳就装稳定版，别把 Beta 里的功能当成既成事实。
4. 部分能力有系统版本配对要求：运行中改分辨率要宿主与客户机都是 macOS 14+，USB 直通要双方都是 macOS 27+，剪贴板要客户机 macOS 14+。
5. 隧道放宽要谨慎：选 Never 之后，客户机里的任何程序都能连上宿主机任意端口。
6. vbctl 一旦开启，任何以你身份运行的程序都能调用它；官方明确它不能改安全设置、不能批准隧道，但这仍是一个需要权衡的开关。
7. 装较新的 macOS 恢复映像时可能要先补设备支持包，这一步并不总是顺利，官方文档也把「需要更新设备支持」单独列了出来。

## 四、安装方式

### Homebrew

```bash
brew install --cask virtualbuddy
```

### 手动下载

1. 打开 [官方 Releases 页面](https://github.com/insidegui/VirtualBuddy/releases)。
2. 下载最新稳定版；想试新功能可以取 Beta 版。
3. 打开应用，在库里点 **+**，选 macOS 或 Linux，按向导下载镜像并安装。

### 从源码构建

需要 Xcode 27 与 macOS 27 SDK：

1. 用 Xcode 打开 `VirtualBuddy.xcodeproj`。
2. 在 `VirtualBuddy/Config/Signing.xcconfig` 里把 `VB_BUNDLE_ID_PREFIX` 改成自己的前缀，注意末尾要带一个点。
3. 在 Signing & Capabilities 里给应用和它内嵌的目标（VirtualBuddyGuest、VirtualBuddyGuestHelper、VirtualInstallationService）选好开发团队，并把 `Security.xcconfig` 里的 `VB_DEVELOPMENT_TEAM` 设成同一个 Team ID。
4. 选 VirtualBuddy scheme，在 My Mac 上构建运行。

官方项目地址：[github.com/insidegui/VirtualBuddy](https://github.com/insidegui/VirtualBuddy)

## 五、综合评价

VirtualBuddy 解决的是 macOS 开发者一个很具体的日常问题：需要一个不同于主力机的 macOS 环境。它不是把功能堆得最多，而是把「从零到能用的虚拟机」这条路径上的摩擦点一个个削掉——镜像在应用里下、装完自动挂 Guest 应用、共享目录和剪贴板直接可用、开发服务器用一条隧道就能从宿主机访问。

真正拉开差距的是两处工程细节。一是 vbctl：语义化退出码、`--json`、补全脚本，说明作者是按「会被脚本调用」来设计的，而不是随手加个 CLI 门面。二是安全默认值：命令行访问默认关闭且需要生物认证，隧道默认逐条审核，放宽时官方文档也把风险讲明白。这类默认值比功能列表更能说明项目成熟度。

它也有明确边界。只支持 Apple 芯片，宿主机要 macOS 14 起，客户机最低 macOS 12，想跑 Windows 或 x86 系统就只能换方案。最新版还是 Beta，尝鲜可以，生产环境建议看稳定版 2.2.1。

综合来看，如果你的工作流里有「多版本 macOS 测试」「一次性干净环境」「在 Mac 上跑 ARM64 Linux」这几件事，VirtualBuddy 是当前开源方案里完成度最高的选择之一，装一个放着，需要时几分钟就能起一台。

**一句话评价：** 免费开源、走 Apple 官方虚拟化框架的 macOS 虚拟机管理器，安装链路和命令行控制做得比多数同类工具完整，代价是只认 Apple 芯片。

---

*资料来源：*

- [VirtualBuddy 官方 GitHub 仓库](https://github.com/insidegui/VirtualBuddy)
- [VirtualBuddy 官方 Releases](https://github.com/insidegui/VirtualBuddy/releases)
- [官方命令行文档 Documentation/CommandLine.md](https://github.com/insidegui/VirtualBuddy/blob/main/Documentation/CommandLine.md)
- [官方 Service Tunnel 文档 Documentation/ServiceTunnels.md](https://github.com/insidegui/VirtualBuddy/blob/main/Documentation/ServiceTunnels.md)
- [项目许可证 LICENSE（BSD-2-Clause）](https://github.com/insidegui/VirtualBuddy/blob/main/LICENSE)
