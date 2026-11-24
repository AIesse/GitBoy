---
title: "NetNewsWire 7：Mac 与 iPhone 上免费开源的 RSS 阅读器"
description: "NetNewsWire 7 是 Mac、iPhone、iPad 上免费开源的 RSS 阅读器。本文依据官方仓库、官网与发布说明，梳理它的同步方式、阅读视图、主题机制、安装步骤与注意事项。"
pubDate: 2026-11-24T09:32:55+08:00
tags: [效率工具, macOS, 开源软件]
---

![NetNewsWire 7 for Mac：左侧订阅源与文件夹，中间文章列表，右侧阅读视图](/GitBoy/images/netnewswire-rss-reader-review/01-mac-light.jpg)

订阅这件事很容易烂尾。一开始只是几个博客，后来是技术周刊、行业媒体、独立作者，几十个站点的更新散在浏览器书签、社交平台的时间线、微信收藏和邮件里。想认真读完，得挨个打开；想跳过噪音，又得靠平台算法替你决定什么值得看——而算法关心的通常不是你。

RSS 本来就是为这件事设计的：站点发布一个订阅地址，阅读器定时去取，只把新文章推给你。真正麻烦的是客户端：收费的订阅制、绑定的在线服务、说停就停的项目。**NetNewsWire** 是这一小块市场里少见的长期主义者，2002 年就有第一个版本，如今仍然免费、开源，同时提供 Mac 与 iPhone / iPad 客户端。

**NetNewsWire 是一个免费开源的 RSS / Atom / JSON Feed 阅读器，运行在 macOS、iPhone 与 iPad 上。** 它在本地管理订阅与已读状态，也可以通过 iCloud 或第三方 RSS 服务在设备之间同步；文章在应用内阅读，支持阅读视图、主题、文件夹、搜索与系统分享。

> 本文依据 NetNewsWire 官方 GitHub 仓库、官网功能页、官方 FAQ、技术说明与发布说明整理（数据核对于 2026-11-24），属于资料型评价。文中没有对应用做逐项实机测试，凡涉及界面细节均来自官方截图与文档；功能状态以官方仓库为准。

## 一、核心功能

### 1. 三栏布局与智能订阅源

Mac 版是典型的三栏结构：左边是订阅源与文件夹，中间是文章列表，右边是正文。除了自己建的文件夹，顶部还有三个不占订阅位的「智能订阅源」——Today、All Unread、Starred。按官方 FAQ 的说法，Today 装的是最近 24 小时的文章，这样设计的理由是：如果严格按自然日计算，半夜读订阅时会眼看着列表清空。

列表里未读文章带蓝点，读完即消失；可以隐藏已读文章和已读订阅源，让列表只留待读内容。右侧内容区上方有搜索框，用来在文章里找关键词。

![同一套界面的深色模式](/GitBoy/images/netnewswire-rss-reader-review/02-mac-dark.jpg)

### 2. 多账户与同步

NetNewsWire 把「账户」当成数据边界。默认有一个本地账户（Mac 上叫 On My Mac，iOS 上叫 On My iPhone），直接抓取订阅源、不做同步；iCloud 账户同样直接抓取，但会把订阅列表和已读 / 星标状态通过 iCloud 同步。官方 FAQ 写明 iCloud 同步从 6.0 版本开始支持，速度取决于 iCloud 本身，刚导入 OPML 或新增设备时会明显变慢。

除了 iCloud，它还接入了一批在线 RSS 服务。官网功能页列出的是：Feedbin、Feedly、BazQux、Inoreader、NewsBlur、The Old Reader、FreshRSS。这类账户的订阅与已读状态由服务端保存，适合已经在用其中某家的用户——换客户端不用换服务，历史记录也还在。

一个细节值得注意：本地账户与 iCloud 账户是直接抓取订阅源的，第三方服务账户则走各自 API。三种方式的差别会体现在刷新频率、能否离线读全文，以及换设备后的迁移成本上。官方 FAQ 也明确说，目前没有再增加其他同步服务的计划（该页最后更新于 2022 年 11 月），所以选服务时最好按长期使用来考虑。

![iPad 版：侧边栏订阅源、Today 列表与阅读视图](/GitBoy/images/netnewswire-rss-reader-review/03-ipad.jpg)

### 3. 阅读视图与主题

订阅源提供的往往只是摘要，正文要到网页上看。NetNewsWire 的阅读视图（Reader View）负责把网页正文抽出来重新排版，去掉广告和侧栏。官方 FAQ 说明了两件事：一是它无法全局常开，因为网页结构千奇百怪，抽取不一定成功；二是抽取工作要调用服务器完成，那台服务器由 Feedbin 免费提供。

因此更实际的做法是按订阅源开启：在 Mac 上右键点击订阅源选「Always Use Reader View」，iOS 上进入该订阅源的设置打开同名开关。全文输出的站点本来就不需要它，还能省电省流量。

外观上，它自带多套文章主题，并支持第三方的 `.nnwtheme` 包。按官方技术说明，一个主题由 `Info.plist`、`template.html`、`stylesheet.css` 组成，7.3 之后还可以额外放一个 `template7.3.html`，用来使用 `[[primary_media]]` 与 `[[enclosures]]` 两个新标签——它们会把文章的主图、音频、视频以及附件里的图片挑出来显示。主题本身不能加载自己的 JS、图片和字体文件，相对路径会按文章所在站点解析；内联脚本只在「Article JavaScript」设置开启时运行，这个设置默认是开的。

### 4. 订阅管理与 OPML

添加订阅有三条路：在应用里输入站点地址、用 Safari 扩展把当前网页的订阅源交给它、或者导入 OPML 文件。OPML 是 RSS 世界的通用订阅清单格式，几乎所有阅读器都支持导入导出，这也是从别的客户端搬过来、或者哪天想搬走时最省事的通道。

管理上有文件夹分组、多账户并存（同一类账户可以建多个，iCloud 账户除外）、按订阅源设置通知。7.3.1 的发布说明里，这项设置被改名为「Notify About New Articles」，位置在检查器和侧边栏右键菜单里。

### 5. 系统集成

Mac 版支持多窗口、可自定义工具栏，并提供 AppleScript 接口，方便写脚本批量处理；分享菜单可以把文章发到 Mail、MarsEdit、Micro.blog、Notes、Messages 等目标。iOS 版提供七个小组件：一个小尺寸显示三个智能订阅源的数量，三个中尺寸分别对应 Today、All Unread、Starred，三个大尺寸是它们的信息更全的版本。中尺寸小组件带深链，点开某篇未读文章会直接跳到应用内那篇文章。

![iPhone 版 Today 时间线：未读计数、来源图标与摘要](/GitBoy/images/netnewswire-rss-reader-review/04-iphone-timeline.jpg)

## 二、适合哪些使用场景？

- **订阅了几十上百个源，想按自己的顺序读：** 不依赖平台推荐，谁更新了什么由你自己判断。
- **同时用 Mac 和 iPhone / iPad：** 用 iCloud 或第三方服务同步订阅与已读状态，读到哪儿接着读。
- **已经在用 Feedbin、Feedly、Inoreader 等服务：** 把它当客户端，服务端数据不动，换个更轻的界面。
- **不想订阅制付费、也不想被单一服务锁住：** 开源、MIT 许可，订阅清单随时可以 OPML 导出。
- **只想读、不想折腾服务器：** 本地账户不需要任何后端，装上就能用。
- **需要脚本化或深度定制：** Mac 版有 AppleScript，外观可以用 `.nnwtheme` 改。

如果你只是偶尔看两个博客，浏览器标签页或者邮件订阅其实够用；RSS 阅读器的价值随订阅数量上升，源太少时体会不到。

## 三、优点与注意事项

**优点**

1. 免费且开源，MIT 许可证，版权信息写的是 2002–2025 Brent Simmons；仓库 README 的支持说明直接写着「don't send money」。
2. 项目很稳：仓库约 10,560 星（2026-11-24 核对），最近提交在 2026-11-23，Mac 7.3.1 于 2026-11-20 发布，iOS 7.3.1 于 2026-11-22 发布。
3. 同步方式给得全：本地、iCloud，外加七家主流在线 RSS 服务，换客户端不丢数据。
4. 原生应用，macOS 与 iOS 各自适配，支持深色模式、多窗口、AppleScript、Safari 扩展和 iOS 小组件。
5. 界面结构清晰，三栏 + 智能订阅源的设计把「待读」和「订阅管理」分开了，日常主要是读列表。

**需要留意**

1. **阅读视图依赖外部服务器。** 官方 FAQ 写明它调用的是 Feedbin 免费提供的服务器，且无法全局常开；抽取失败时只能看原文。
2. **系统要求不低。** 官网下载标注 macOS 15 及以上，App Store 版标注 iOS 26 及以上。旧机器只能用历史版本，官方提供的老版本下载最早可以回溯到 2006 年。
3. **本地账户不跨设备。** 想同步必须用 iCloud 或第三方服务；iCloud 本身会限速，大量订阅首次同步需要等。
4. **自行编译的版本是「残血」的。** README 说明，因为没有把 API key 放进仓库，克隆构建出来的版本会禁用 iCloud、Feedly 等账户类型，阅读视图也不可用。想完整体验就用官方发行版。
5. **个别源已经不支持。** 7.3.1 发布说明写明停止刷新 Reddit 订阅，理由是 Reddit 不再提供 RSS。
6. **目前只有英文界面。** 官方 FAQ 说本地化在计划里，但尚未完成，中文用户需要习惯英文菜单。

## 四、安装方式

### Mac：官网直接下载

官网提供的是 zip 压缩包，解压后把应用拖进「应用程序」即可，不经过 App Store：

```
https://netnewswire.com/NetNewsWire.zip
```

要求 macOS 15 及以上。首次打开后可以先删掉内置的示例订阅——官方 FAQ 说新用户会预置 16 个订阅源，从 2002 年的 NetNewsWire Lite 1.0 起就是这个数量，目的是让人装完就有东西可读。

### iPhone / iPad：App Store

在 App Store 搜索 NetNewsWire，或从官网的 App Store 按钮进入。iOS 版要求 iOS 26 及以上。装好后如果选了 iCloud 账户，Mac 上的订阅会自动出现；用第三方服务的，在两台设备上登录同一个账户即可。

### 从源码构建

需要 Xcode。按 README 的说明，不需要付费开发者账号：

```
git clone https://github.com/Ranchero-Software/NetNewsWire.git
```

代码签名可以用仓库里的 `setup.sh` 生成 `DeveloperSettings.xcconfig`，也可以手动在仓库同级目录建 `SharedXcodeSettings/DeveloperSettings.xcconfig` 并写入团队 ID。再提醒一次：这样构建出来的应用缺少 API key，部分账户类型和阅读视图不可用，适合改代码或做实验，不适合日常使用。

### 从别的阅读器迁移

在原客户端导出 OPML，然后在 NetNewsWire 里选择导入。导入后建议先只留几个常读的源，等 iCloud 同步稳定下来再逐步加——官方 FAQ 提到，一次性导入大量订阅是同步变慢最常见的原因。

## 五、综合评价

NetNewsWire 的价值不在于功能列表有多长，而在于它把一个容易被做坏的东西保持了二十多年：一个不收费、不锁数据、跟着系统版本更新的原生 RSS 阅读器。三栏布局、智能订阅源、阅读视图、主题、多账户同步，这些能力拼起来正好覆盖「订阅很多、想在 Mac 和手机上读完」的日常路径，没有多余的概念要学。

它的克制也很明显。阅读视图要借 Feedbin 的服务器、不能全局常开；本地账户不跨设备；界面只有英文；自编译版本功能残缺。这些都不是隐藏的坑，官方文档和 FAQ 里写得很清楚，接受起来并不难，但选购前应当知道。

如果你已经在为某个在线 RSS 服务付费，或者正被社交平台的信息流牵着走，NetNewsWire 是一个成本极低的替代方案：装上、导入 OPML、按需打开阅读视图，剩下的就是每天把列表读完。它不会替你做推荐，也不会替你决定什么重要——这恰好是它还值得用的原因。

**一句话评价：** 一个免费开源、更新稳定、把订阅数据留在自己手里的原生 RSS 阅读器，适合订阅量大又同时用 Mac 与 iPhone 的人。

---

*资料来源：*

- [NetNewsWire 官方 GitHub 仓库](https://github.com/Ranchero-Software/NetNewsWire)
- [NetNewsWire 官网](https://netnewswire.com/)
- [NetNewsWire 官方 FAQ](https://netnewswire.com/frequently-asked-questions.html)
- [NetNewsWire 官方 Releases](https://github.com/Ranchero-Software/NetNewsWire/releases)
- [NetNewsWire 的 MIT 许可证](https://github.com/Ranchero-Software/NetNewsWire/blob/main/LICENSE)
