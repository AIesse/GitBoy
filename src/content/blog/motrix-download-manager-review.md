---
title: "Motrix 2.x：aria2 内核的开源下载器，桌面端和 NAS 都能跑"
description: "Motrix 2.x 的功能、插件机制、Docker Server 部署与升级注意事项，含 aria2 引擎、音视频合并插件与 NAS 安装方式。"
pubDate: 2026-11-27T12:06:20+08:00
tags: [开源软件, 效率工具, NAS]
---

![Motrix 2.x 的下载列表界面，左侧是仪表板、下载、Trackers 与插件四个入口](/GitBoy/images/motrix-download-manager-review/01-downloads.jpg)

浏览器自带的下载器应付单个小文件还行，一旦碰上十几 G 的镜像、需要续传的断点任务，或者一堆靠磁力链接分发的资源，就开始掉链子：速度上不去、关掉页面就断、下完不知道文件散在哪个临时目录。换个专业下载器又要重新学一套界面，很多老牌工具界面停在十年前，Linux 和 NAS 上压根没有图形端。

**Motrix** 是一款开源的全能下载器，基于 Electron 构建界面、底层跑 aria2 引擎，支持 HTTP、FTP、BitTorrent 和磁力链接。2.x 版本做了大幅重构：引擎换成了项目自己维护的 aria2 fork（用 SQLite 存状态），并额外提供一套 Docker Server 镜像，可以把同一套 Web 界面部署到 NAS 或家庭服务器上，用浏览器远程管理下载任务。

> 本文依据 Motrix 官方仓库 README、`docs/` 目录下的 Docker Server 与插件文档、v2.4.7 发布说明以及仓库截图整理，属于资料型评价。文中版本号、端口号、参数与镜像 tag 均摘自官方文档，未逐项实测；具体行为以官方文档和实际版本为准。

## 一、核心功能

### 1. 一个界面管住 HTTP、FTP、BT 与磁力

下载列表支持添加链接、种子文件和磁力链接三类任务。列表页提供「全部下载」等视图切换，底部常驻一条状态栏，显示当前限速模式、实时上下行速度和 NAT 映射状态。设置里可以开启每日自动更新 Tracker 列表，也能配置 UPnP / NAT-PMP 端口映射，这对 BT 下载的可连接性影响很直接。

引擎是捆绑的 aria2 fork，仓库为 `motrixapp/aria2`。v2.4.7 用的是 `aria2 1.37.0-motrix.26`，主要改动集中在各种「下不动」的场景：允许动态 CDN 或镜像重定向目标并发续传、修复大文件拿不到 `Content-Length` 导致没有进度百分比和断点续传的问题、跨源签名重定向（GitHub Releases、S3、R2、OSS、COS 之类）校验时忽略短期签名参数但仍拒绝真实资源变更。

### 2. 仪表板：引擎状态与传输统计

![Motrix 仪表板：引擎状态、限速模式、上下行速度、活跃任务与传输热力图](/GitBoy/images/motrix-download-manager-review/02-dashboard.jpg)

仪表板把关键状态摊在一屏：引擎是否就绪、当前运行的 aria2 版本、限速模式（常规／兔子／乌龟／蜗牛四档）、实时上下行、活跃任务按下载中／等待／做种分类计数，还有一张按天统计的传输热力图。排查「为什么没速度」时，先看这里比赛猜快：引擎不可用、NAT 未映射、限速档位不对，一眼能看出来。

### 3. 设置与端口：2.x 改过默认值

![Motrix 设置界面](/GitBoy/images/motrix-download-manager-review/03-settings.jpg)

2.x 把 BitTorrent 的默认监听端口从老版本的 `6881` 迁移到了 `21301`（BT）和 `26701`（DHT），用户自定义过的端口保持不变；端口绑定失败时会给出明确的 `BtPortBindFailed` 诊断提示，而不是静默失败。升级后如果路由器上做过端口转发，需要同步改这两条规则。

另外两个细节：运行期日志 `motrix.log` 达到 5 MiB 会自动轮转并只保留一份备份；启动时会清理系统临时目录里残留的 `motrix-media-*` 孤儿目录，避免长期占盘。

### 4. 插件与音视频合并

2.x 引入了插件系统，包格式为 `.moext`，安装包需要用 Ed25519 签名，宿主会校验签名、大小、SHA-256、插件标识与版本范围后才加载。官方可选插件从插件市场安装，权限默认关闭、按需授予，桌面端和 Server 端共用同一套流程。

目前最实用的是官方插件 `motrix.media-merge`：把 BT 下载下来的视频轨和音频轨合并成一个文件。

![音视频合并操作页：选一个视频、一个音频，输出 MP4 或 MKV](/GitBoy/images/motrix-download-manager-review/04-media-merge.jpg)

两个入口：选中两个已完成任务后在任务菜单里点「合并音频和视频」，或者打开插件详情页在「操作」页手动选文件。用之前要在**设置 → 集成 → 媒体工具**里配好 FFmpeg，并授予插件 `ffmpeg` 权限；如果先启用插件后配 FFmpeg，需要停用再启用一次以刷新能力状态。

要点在于合并方式：插件**直接复制编码后的媒体轨道，不重新编码**，所以速度快、画质无损，但也因此不做片段拼接、不校准音画不同步。输入顺序反了会自动交换；两个文件都带音轨时，取「视频文件」的第一条视频轨加「音频文件」的第一条音轨。MP4 装不下所有编码，失败就换 MKV。

### 5. Docker Server：把下载器搬到 NAS

这是 2.x 相对 1.x 最大的变化。官方镜像 `docker.io/motrixapp/motrix-server` 和 `ghcr.io/agalwood/motrix-server` 同时发布，包含 `linux/amd64` 与 `linux/arm64`，容器以非 root 用户运行，根文件系统可以且应当保持只读。

持久化要求两个独立挂载，缺一不可：

- `/data`：SQLite 数据库、设置、aria2 session、DHT 状态、种子元数据、operator token、插件包与状态。**必须备份。**
- `/downloads`：下载中的和已完成的用户文件。

典型部署：

```bash
mkdir -p motrix-data downloads
export MOTRIX_UID="$(id -u)"
export MOTRIX_GID="$(id -g)"
chown "$MOTRIX_UID:$MOTRIX_GID" motrix-data downloads
export MOTRIX_PUBLIC_URL='http://nas.example.lan:8080'
docker compose pull server
docker compose up -d --wait
```

容器内有两个 listener：Web/API 在 `8080`，MDXP（给浏览器扩展和 SSE 流用）在 `16801`。宿主侧发布地址可以分别控制：`MOTRIX_WEB_BIND_IP`、`MOTRIX_MDXP_BIND_IP`，或沿用兼容变量 `MOTRIX_BIND_IP`。想让 Web 开在局域网、MDXP 只走本机，就把后者绑到宿主 loopback——注意不要改容器内的 `MOTRIX_MDXP_HOST`，那个 loopback 属于容器自己，Docker 转发进不去。

原始 aria2 RPC 端口 `16800` 默认只听 `127.0.0.1`。要接第三方 RPC 客户端，得显式设 `MOTRIX_ARIA2_RPC_LISTEN_ALL=true` 并在 Compose 里单独发布端口，而且 RPC secret 为空时会拒绝开启。官方文档把这层风险写得很直白：拿到 RPC secret 基本等于拿到下载引擎控制权，且没有 TLS，不要直接暴露到公网。

群晖 DSM 7 的 Container Manager、bind mount 与 named volume 两种 Compose 写法、同宿主反向代理、容器内反向代理等场景，`docs/docker-server.zh-CN.md` 都有逐步说明，包括 `MOTRIX_PUBLIC_URL`、`MOTRIX_TORRENT_BODY_LIMIT_MIB`（种子请求体上限，默认 8 MiB，可设 2–64）这类参数。镜像还带 OCI labels、SPDX SBOM 和 SLSA provenance，正式 tag 的 digest 可用 `cosign verify` 按 GitHub Actions OIDC 身份校验。

### 6. v1 老用户要按迁移指南走

1.x 升到 2.x 不是简单覆盖安装。捆绑引擎用 SQLite **schema 6**，旧引擎打不开新库，降级必须先停掉所有引擎、再把备份恢复到单独路径，不能靠「重置数据库」蒙混。官方给了独立的迁移文档和迁移结果界面；项目从 v1.8.0 起改过 Bundle ID（`net.agalwood.Motrix` → `app.motrix.native`），所以 v1.6.11 的自动更新会失败，需要用 Motrix Install Assistant 手动过渡。升级前备份配置和下载文件，这一条官方用了粗体。

## 二、适合哪些使用场景？

- **经常下大文件：** 镜像、数据集、视频素材，需要断点续传和稳定多连接。
- **BT 与磁力为主：** 选种下载、每日更新 Tracker、UPnP 端口映射都在设置里。
- **NAS 常驻下载：** 用 Docker Server 跑在群晖或 ARM 小主机上，手机浏览器也能看进度。
- **统一管理多台设备：** 桌面端管日常，Server 管 7×24 的队列。
- **需要合并音视频：** 单独的轨分发资源，下完用官方插件无损合成 MP4/MKV。
- **想少折腾界面：** 中文界面完整，仪表板把引擎状态摊开，不用记 aria2 的配置文件语法。

如果你只是偶尔存个 PDF，浏览器自带下载足够，装一个 Electron 应用属于杀鸡用牛刀。

## 三、优点与注意事项

**优点**

1. 免费开源，MIT 许可，界面与引擎源码都在仓库里；引擎还是自己维护的 aria2 fork，能针对下载问题改到底层。
2. 跨平台齐：macOS 13+、Windows 10+、Linux，提供 x64 与 ARM64 原生构建，Linux 侧有 AppImage、Snap、Flatpak、AUR。
3. 桌面端和 Server 共用一套 Web 界面，NAS 部署后学习成本几乎为零。
4. Docker 镜像工程化程度高：多架构、非 root、只读根文件系统、SBOM、provenance、签名可校验，tag 策略（不可变版本 / `2.4` / `2` / `stable` / `latest`）写得很清楚。
5. 插件有签名和权限确认，不是随便丢个脚本就能跑。
6. 维护活跃：仓库约 5.9 万星，最新 v2.4.7 发布于 2026-11-26，最近提交在 2026-11-27。

**需要留意**

1. 不提供 32 位桌面安装包；老设备或 32 位 ARM 的 NAS 用不了 Server 镜像。
2. Windows 的 NSIS 安装包和 ZIP 没有签名，可能触发 SmartScreen。官方明确说要用 Releases 页面的包。
3. 2.x 是重写，配置和引擎数据库结构都变了，从 1.x 升级必须按迁移指南走并先备份。
4. BT 默认端口换成 21301 / 26701，路由器端口转发要跟着改。
5. 音视频合并插件依赖 FFmpeg，且只做轨道复制，不重新编码、不修音画不同步。
6. Docker 部署必须有两个可写挂载，只挂 `/downloads` 会把数据库和插件状态丢在容器层里，重建即失。
7. 别为了绕开挂载权限把容器跑成 root 或开 privileged 模式，官方文档专门警告过这一点。

## 四、安装方式

### macOS

```bash
brew install --cask motrix
```

也可以从 [Releases](https://github.com/agalwood/Motrix/releases) 下载 DMG，官方 macOS 包经签名与公证。

### Windows

推荐用安装包 `Motrix-Setup-x.y.z.exe`，能正确关联种子文件和磁力链接。包管理器：

```bash
choco install motrix      # Chocolatey
scoop bucket add extras && scoop install motrix   # Scoop，便携版
```

### Linux

```bash
flatpak install flathub net.agalwood.Motrix
yay -S motrix             # Arch / AUR
```

AppImage 需要自行做桌面集成（推荐 AppImageLauncher），Ubuntu 用户也可以走 Snap Store。首次在 Linux 上运行可能需要 `sudo` 一次，因为默认要创建 `/var/cache/aria2.session`。

### Docker（NAS / 服务器）

```bash
export MOTRIX_IMAGE='ghcr.io/agalwood/motrix-server:2.4.7'
export MOTRIX_PUBLIC_URL='http://nas.example.lan:8080'
docker compose -f compose.yaml up -d --wait
```

Compose 文件从仓库根目录取，`compose.yaml` 用 bind mount，`compose.named-volumes.yaml` 让 Docker 托管存储位置。生产环境建议锁死不可变版本 tag，或直接用 digest。

官方项目地址：[github.com/agalwood/Motrix](https://github.com/agalwood/Motrix)

## 五、综合评价

Motrix 1.x 时期的定位很单纯：把 aria2 包装成一个好看的桌面下载器。2.x 明显换了个目标——它想同时占住桌面和 NAS 两个位置，用一套 Web 界面覆盖两种部署形态。Docker Server 的文档质量能说明这是认真做的：两个挂载为什么必须分开、端口发布分几层、RPC 什么时候该开什么时候不该开、反向代理放哪里，都是踩过坑才会写出来的细节。

引擎侧也值得说一句。多数基于 aria2 的下载器只做界面，引擎出问题就只能等上游。Motrix 维护自己的 fork，v2.4.x 几个版本的修复都扎在具体痛点上：CDN 重定向导致多连接失效、大文件没有 Content-Length、SMB 共享盘落盘失败、跨源签名重定向被误判。这类修复普通用户感知不到，但正是「下不动」的真实原因。

代价是复杂度上来了。2.x 有插件、有 Server、有迁移流程，从 1.x 过来的用户必须备份并按文档走，随手覆盖安装会踩到 schema 不兼容。另外 Windows 包没签名、不提供 32 位构建，这两点对小众环境不算友好。

**一句话评价：** 开源下载器里少见的「桌面端 + NAS 容器」双形态方案，aria2 内核加自维护 fork，适合既要 BT 又要 7×24 挂机的用户，代价是升级路径需要照着文档走。

---

*资料来源：*

- [Motrix 官方 GitHub 仓库](https://github.com/agalwood/Motrix)
- [Motrix 官方 Releases](https://github.com/agalwood/Motrix/releases)
- [Docker Server 部署指南 docs/docker-server.zh-CN.md](https://github.com/agalwood/Motrix/blob/main/docs/docker-server.zh-CN.md)
- [官方可选插件 docs/official-optional-plugins.zh-CN.md](https://github.com/agalwood/Motrix/blob/main/docs/official-optional-plugins.zh-CN.md)
- [项目许可证 LICENSE（MIT）](https://github.com/agalwood/Motrix/blob/main/LICENSE)
