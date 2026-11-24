---
title: "tchMaterial-parser：把中小学电子课本批量存成带书签的 PDF"
description: "国家中小学智慧教育平台的电子课本下载工具，批量粘贴预览页网址就能解析成 PDF 直链并下载，自动命名、可加书签，MIT 开源、Windows/macOS/Linux 通用。"
pubDate: 2026-11-24T21:39:56+08:00
tags: [开源软件, 效率工具, 工具, 教程]
---

![tchMaterial-parser 主界面：左侧是按学段、学科、教材版本组织的资源列表，右侧粘贴课本预览页网址，底部是 Token 设置、PDF 书签开关与下载按钮](/GitBoy/images/tchmaterial-parser-textbook-downloader-review/01-main-ui.jpg)

开学前那几天，家长群里最常见的一句话是"课本电子版发一下"。链接发过来，点开是国家中小学智慧教育平台的在线预览——一页一页翻着能看，想存下来给孩子在平板上做笔记就不行了。想打印几页练习，只能截图；想在 PDF 阅读器里跳转到第三单元，得先自己把整本书滑一遍记住位置。一个学期十来本，靠手动右键另存，光是等页面加载就能耗掉半小时。

**tchMaterial-parser 是一个专门干这件事的桌面工具：把电子课本的预览页网址批量解析成 PDF 直链，下载到本地，并按课本名称自动命名、可选自动加书签。** 它用 Python 加 Tkinter 写界面，跑在 Windows、macOS 和 Linux 上，MIT 许可、免费、无账号、无广告。仓库当前 7,903 星、1,009 个 fork，最新版 v4.4 于 2026-10-07 发布，历史 release 累计下载约 44,758 次。

> 本文依据该项目 GitHub 仓库的 README、CONTRIBUTING、pyproject.toml 与 GitHub Releases 页面整理，仓库数据（星标、fork、许可证、贡献者、提交数、发布记录、下载量）于 2026-11-24 通过 GitHub API 核对。笔者未在装有图形界面的机器上完整跑过下载流程，因此下文不写「实测」，功能与行为描述以官方文档写明的内容为准，界面判断仅基于仓库 docs/images 里的官方截图。

## 一、核心功能

### 1. 批量解析：一次粘一批网址，出的是直链

工具的用法很直白。左边是内置的资源列表，按"学段 → 学科 → 教材版本"的层级展开，截图里显示收录了 3,013 项；右边是一个多行文本框，每行粘一个电子课本预览页地址，形如 `https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId=...&catalogType=tchMaterial&subCatalog=tchMaterial`。

两个按钮分工明确：**「解析并复制」** 只把资源的 PDF 直链解析出来放进剪贴板，不下载文件；**「下载」** 则解析加下载一条龙。这个拆分很实用——有的人只想拿到链接丢进下载器，有的人想让工具自己下完，两种需求不用互相迁就。

资源列表本身也能直接点。不想去浏览器里翻链接，就在搜索框按名称搜，或者按学段、学科、年级组合筛选，结果会自动展开；名称太长可以横向滚动，悬停能看到完整信息和大尺寸封面。对"我知道要六年级上册数学，但不知道它在平台上的 contentId"这种场景，这一步省掉了来回跳转。

### 2. 下载管理：批量下载最怕的"卡在第五本"

v4.4 最大的更新是把下载过程做成了一个独立的管理窗口，这也是这类工具最容易偷懒的地方。列表里每一项显示资源名称、状态、进度、文件大小和下载速度；服务器没给文件大小时，退而显示已接收的数据量。任务可以按「进行中 / 需处理 / 已完成」筛选，也能搜索。

出错的处理方式值得单独说。批量下载最烦的是失败信息糊成一团——传统做法是弹一个长对话框，里面几十行报错，看完也不知道哪本书失败了。这里改成在「需处理」里逐条查看，错误详情可以复制，当前批次结束后可以对失败或已停止的任务「重新下载」，也可以一键「重试失败项」；解析失败的页面还能单独「重新解析」。重新下载是从头开始的，官方文档把这一点写明了。

另外两个行为细节：点「停止下载」后已完成的文件保留、未下完的文件不会留下残缺内容；关掉下载管理窗口，下载仍在后台继续。这两条都属于"看起来理所当然、实际很多工具做不到"的部分。

### 3. 自动跳过已有文件，自动命名

选定目录里已经下载完成的同名课本会被自动跳过。这意味着重新下载整套资源时，工具只补齐缺失的和上次失败的那些，不会给你生成一堆带 `(1)`、`(2)` 后缀的副本。文件名默认取课本名称，不用自己重命名。

对一次要下十几本、中途还可能断网重来的场景，这个设计省的是整理时间，不是下载时间。

### 4. 自动加 PDF 书签

勾上「添加 PDF 书签」，下载完成后工具会给课本加上书签目录。从官方截图看，效果是在 PDF 阅读器的侧栏里出现完整的章节树——"我上学了""第一单元 识字""1 天地人"这一层级的条目，点一下直接跳转。

技术上不复杂（依赖里就一个 `pypdf`），但对使用者是实打实的差别：一本一百多页的电子课本，没有书签等于每次都要重新定位。全书的页码和章节对不上时，这个功能的价值最明显。

![加了书签的电子课本 PDF：侧栏列出从单元到课文的完整层级，可直接跳转](/GitBoy/images/tchmaterial-parser-textbook-downloader-review/04-bookmarks.jpg)

### 5. Access Token：可选项，但建议设

平台对未授权的直链请求限制得比较紧，所以工具提供了一个可选的 Access Token。官方说明是：不设也能下，但"这一方法并不长期有效"，所以建议设置。

获取方式是在浏览器里登录平台账号，打开开发者工具的控制台，粘一段官方提供的脚本，脚本从 localStorage 里找出形如 `ND_UC_AUTH-...&token` 的键，解析出 `access_token`、`mac_key`、`diff` 三个字段，打印成一段 JSON。复制这段 JSON，回到工具点「设置 Token」粘贴保存即可。

![官方给出的 Token 获取步骤：在控制台粘贴脚本，复制输出的 JSON 再粘回工具](/GitBoy/images/tchmaterial-parser-textbook-downloader-review/02-token.jpg)

几个官方明确写出来的坑：先登录再粘代码；粘到控制台里 `>` 提示符后面，不要粘到"过滤/筛选器"输入框；Chrome 可能拦截粘贴，按提示输入"允许粘贴"再粘一次；`localStorage` 里还有一个 `sdk_cache` 项，那是账号资料缓存，里面没有 Token，别随便复制。

Token 会过期，README 写的是一般 7 天，过期就重新取一次。存放位置分平台：Windows 写注册表 `HKEY_CURRENT_USER\Software\tchMaterial-parser` 的 `AccessToken` 值，Linux 存在 `~/.config/tchMaterial-parser/data.json`，macOS 存在 `~/Library/Application Support/tchMaterial-parser/data.json`。官方也说明了工具不上传、不云存 Token，只用于本地请求授权。

### 6. 界面：深色模式、高 DPI、跨平台

界面用的是 Tkinter 加 sv-ttk 主题，视觉上是 Windows 11 那一套圆角、浅色描边的风格，跟原生 Tkinter 的观感差得挺远。启动时跟随系统深浅色，也能手动切，切换结果会被记住。高 DPI 做了适配，官方称解决了高分屏下发虚的问题。

功能不花哨，但该有的位置都对：资源列表、网址输入、Token 设置、书签开关、下载按钮，一屏之内全在。

![深色模式下的同一界面：配色跟随系统切换，布局与浅色模式一致](/GitBoy/images/tchmaterial-parser-textbook-downloader-review/03-dark-mode.jpg)

## 二、适合哪些使用场景？

- **家长或老师批量准备教材：** 一学期十几本，一次粘完网址，挂着下完就行，重下只补缺的。
- **需要在平板上看、要做笔记：** 存成本地 PDF 加书签，比在网页里一页页翻强得多。
- **只想拿直链：** 用「解析并复制」，把链接丢给自己的下载器或 NAS。
- **网络不稳的环境：** 能中途停、能续着补、失败项能单独重试。
- **不装图形界面也要用：** 不行。这工具是 GUI 程序，官方明确写了需要图形界面。
- **想自己改：** MIT 许可，Python 3.10 以上，`pip install .` 之后 `python ./src/main.py` 就能跑。

如果你的需求是"在服务器上定时抓一批课本"，这个工具不合适——它是给人点按钮用的，没有命令行批量模式。

## 三、优点与注意事项

**优点**

1. 只做一件事，但做得完整：解析、下载、命名、书签、管理、重试，闭环没有断点。
2. 批量与容错做得细：自动跳过同名文件、可停止、可重试失败项、错误逐条可读。
3. 装了就能跑：Releases 里是打包好的单文件程序，Windows 和 Linux 下不需要安装步骤。
4. 跨平台齐全：Windows x64/Arm64、macOS x64/Arm64、Linux x64/Arm64 都有对应产物。
5. 分发渠道正经：Windows 有 winget（`happycola233.tchMaterial-parser`），Arch 有 AUR（`tchmaterial-parser`）。
6. 维护不算单薄：23 个 release、216 次提交、13 位贡献者，主要两位维护者合计提交 175 次；README 称项目在 2025 年 5 月登上过 GitHub Trending 总榜第 3 名。

**需要留意**

1. **版权与使用范围是硬约束。** 官方免责声明写得很清楚：工具只提供下载便利，不存储、不托管、不分发任何内容，资源直接来自国家中小学智慧教育平台；版权归原平台及相关权利人所有，**仅限个人学习与教学参考，请勿商用或二次分发**；项目与平台没有任何隶属或合作关系。转发 PDF 给同事朋友之前，先想清楚这一条。
2. **Token 会过期，大概 7 天。** 下载失败先去查 Token，这是官方 FAQ 排在第一位的答案。
3. **macOS 没签名。** 官方警告：系统会直接报"文件已损坏"，需要执行 `xattr -cr /path/to/tchMaterial-parser.app` 去掉隔离属性；为了让 Token 持久化，还建议先把应用挪进 `/Applications`。
4. **Windows 7 / 8.1 官方不支持。** 官方给了一个非官方分支 `tchMaterial-parser-for-Windows7`（用 Python 3.8 语法）。非官方分支的代码与安全性与主仓库无关，装之前自己掂量。
5. **依赖平台接口的稳定性。** 工具能工作的前提是平台页面结构不变；官方 FAQ 里"确认输入的网址有效，部分旧资源可能已被移除"这句话，说明资源本身也会下线。
6. **别碰来源不明的"整合包"。** 这类工具在中文互联网上传得很快，二次打包塞广告或脚本的情况不少。要装就从 Releases 或 winget/AUR 装。

## 四、安装方式

### Windows

```powershell
winget install happycola233.tchMaterial-parser
```

也可以从 Releases 下载 `tchMaterial-parser-windows-x64.exe` 或 arm64 版本，双击运行，不需要安装步骤。

### macOS

到 Releases 下 `tchMaterial-parser-mac-arm64.zip`（Apple Silicon）或 `mac-x64.zip`（Intel），解压后先处理隔离属性：

```bash
xattr -cr /Applications/tchMaterial-parser.app
```

官方建议把 app 放进 `/Applications` 再首次运行，否则 Token 可能存不住。

### Linux

```bash
yay -S tchmaterial-parser
```

Arch 系可以用 AUR 包。其他发行版直接下 Releases 里的 `tchMaterial-parser-linux-x64` 或 `arm64`，加执行权限后运行。注意需要图形界面，纯命令行的服务器上跑不起来。

### 从源码运行

需要 Python 3.10 或更高版本：

```bash
git clone https://github.com/happycola233/tchMaterial-parser.git
cd tchMaterial-parser
python -m pip install .
python ./src/main.py
```

Debian/Ubuntu 上如果缺 Tkinter，装 `python3-tk`；界面出现方框乱码，通常是缺中文字体和 Emoji 字体，装 `fonts-noto-cjk` 与 `fonts-noto-color-emoji`。

### 用之前的两步

1. 在平台网页上登录账号，按官方脚本取出 Token，粘进工具的「设置 Token」。
2. 勾上「添加 PDF 书签」，选好保存目录，把网址一行一个粘进去，点「下载」。

## 五、综合评价

这类工具的价值不在技术难度，而在"把一串琐碎步骤压成一个动作"。解析直链、批量排队、自动命名、跳过已有、失败重试、加书签——每一项单拎出来都不复杂，但凑齐并且不出错，就足以让人不再手动右键另存。

它的边界也清楚：依赖平台接口、依赖 Token 时效、只服务个人学习场景，官方自己在免责声明里把话说得很硬。这不是甩锅，是这类工具该有的态度——把合法性交给使用者判断，把技术部分做好。

真正让它比同类耐用的是维护状态：23 个版本、13 位贡献者、还有人在 2026 年 10 月给它加下载管理器。这类小工具最常见的死法是作者毕业了就没人管，这个项目目前还没走到那一步。

**一句话评价：** 一个把电子课本下载这件事做到闭环的小工具，功能不炫但每个坑都填过，唯一要认真对待的是它的使用边界。

---

*资料来源：*

- [tchMaterial-parser 官方 GitHub 仓库](https://github.com/happycola233/tchMaterial-parser)
- [GitHub Releases（v4.4 及各平台产物）](https://github.com/happycola233/tchMaterial-parser/releases)
- [MIT 许可证原文](https://github.com/happycola233/tchMaterial-parser/blob/main/LICENSE)
- [贡献者指南 CONTRIBUTING.md（本地开发与打包）](https://github.com/happycola233/tchMaterial-parser/blob/main/CONTRIBUTING.md)
- [国家中小学智慧教育平台电子课本频道](https://basic.smartedu.cn/tchMaterial/)
