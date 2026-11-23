---
title: "Win11Debloat：用一个脚本清掉 Windows 11 的预装应用与推广"
description: "开源 PowerShell 工具 Win11Debloat 的功能、场景、注意事项与安装方式：可移除 170 款预装应用、调整 106 项设置，MIT 许可，附回滚方案。"
pubDate: 2026-11-23T08:15:33+08:00
tags: [开源软件, 效率工具, 工具]
---

![Win11Debloat 的图形界面：左侧为隐私与 AI，中间为系统与更新，右侧为开始菜单与任务栏](/GitBoy/images/win11debloat-windows-cleanup-review/01-system-tweaks.jpg)

新装的 Windows 11 有个共同的开局：开始菜单里塞着 TikTok、Amazon、Spotify 的快捷方式，设置首页顶着 Microsoft 365 广告，搜索框一敲字先给你一串 Bing 结果，任务栏上还挂着资讯小部件。这些都不是你装的，但清理起来要一项项翻设置、一个个右键卸载，中途还会遇到卸载按钮变灰的应用。

**Win11Debloat** 是一个开源的 PowerShell 脚本，用于在 Windows 10 和 Windows 11 上批量移除预装应用、关闭遥测与广告推荐、调整界面与资源管理器行为。它不需要安装，通过图形界面勾选、命令行参数或一键默认模式三种方式应用改动，并在动手前创建还原点和注册表备份，官方仓库以 MIT 许可发布。

> 本文依据 Win11Debloat 官方 GitHub 仓库、官方 Wiki 文档与发布说明整理，配图取自官方仓库和官方 Wiki 的截图。作者没有 Windows 环境，未在本机实机执行脚本，因此文中所有功能与参数均按官方文档与源码描述陈述，属于资料型使用评价，具体行为请以官方仓库为准。

## 一、核心功能

### 1. 图形界面：按分类勾选，一次提交

脚本现在的主入口是一个 WPF 图形界面，而不是过去那种纯控制台问答。窗口按三栏铺开十二个分类：左侧是「隐私与推荐内容」「AI」「外观」，中间是「系统」「Windows 更新」「文件资源管理器」，右侧是「开始菜单与搜索」「任务栏」。每一项都是带说明的复选框，鼠标悬停能看到这项改动具体做什么，右上角还有搜索框，可以直接搜「telemetry」这类关键词定位。

顶部的 Quick Select 提供预设组合，点开可以一次性勾上「默认设置」「默认应用」这类成组的选项；Detect applied tweaks 用来识别系统里已经生效的改动，避免重复勾选；底部的 Back / Next 是分步向导，确认后统一提交。按仓库里的配置文件统计，界面上一共列出 106 项可调设置，分成 12 个分类。

![Win11Debloat 的命令行菜单：默认模式、应用移除模式、复用上次设置三个入口](/GitBoy/images/win11debloat-windows-cleanup-review/02-cli-menu.jpg)

### 2. 应用移除：170 款应用的清单，按需勾选

应用移除是它最早也最核心的能力。官方 Wiki 的移除清单目前列了 170 款应用，涵盖微软自带组件（3D Builder、地图、Clipchamp、Teams、Copilot+ AI Hub 等）、OEM 预装（Acer Care Center、HP 系列工具）和第三方捆绑（Amazon、TikTok、Spotify）。默认选择里勾了 82 款，其中微软应用 41 款、第三方应用 41 款。

卸载并不靠暴力删除目录，官方文档写明用的是 Windows 自带的两个包管理通道：Appx（`Get-AppxPackage` / `Remove-AppxPackage`）和 WinGet。应用选择窗口顶部有全选开关，底部有「Only show installed apps」复选框，可以只看本机真实装了的那些，避免在几十个用不上的条目里翻找。Edge 也有专门的 `-ForceRemoveEdge` 参数，但官方把它标成「NOT RECOMMENDED」，只删浏览器主体、保留 Core、WebView 和更新组件，否则会影响依赖 WebView 的应用。

### 3. 命令行接口：参数化、可静默、可预演

图形界面之外，脚本暴露了完整的一套参数。加 `-CLI` 会回到控制台菜单，只有三个选项：默认模式、应用移除模式、复用上次使用的设置。

真正适合自动化的是直接传参。设置类参数按功能命名，例如 `-DisableTelemetry`、`-DisableBing`、`-DisableRecall`、`-DisableCopilot`、`-ShowKnownFileExt`、`-TaskbarAlignLeft`，可以一条命令串多个；再补一个 `-Silent` 就完全不弹交互，适合写进装机脚本或远程执行。`-WhatIf` 能在不落地任何改动的前提下预演会做什么，`-RunDefaults` 应用默认设置并移除默认应用，`-RunDefaultsLite` 只改设置不动应用，`-RunSavedSettings` 复用上次的勾选。配置也可以存成文件复用，但官方注明配置文件目前只能通过图形界面导出，再用 `-Config` 指定路径加载。

### 4. 回滚：还原点、注册表备份、重装应用

改系统设置最怕改完回不去，这个项目在回滚上做了三层安排。

第一层是系统还原点：默认设置里包含「创建系统还原点」，也可以用 `-CreateRestorePoint` 单独触发，官方说明是 24 小时内已创建过就跳过。第二层是注册表备份：从 2026.05.10 版本起，脚本在应用改动前会自动备份相关注册表项，不想备份可以用 `-SkipRegistryBackup` 关掉。恢复入口在界面右上角的 Options 菜单里，选 Restore backup，然后挑 Restore Registry Backup 或 Restore Start Menu Backup，选中备份文件、看过变更摘要再确认。

![Win11Debloat 的 Restore Backup 对话框：可恢复注册表备份或开始菜单布局备份](/GitBoy/images/win11debloat-windows-cleanup-review/03-restore-backup.jpg)

第三层是重装：卸载掉的应用几乎都能从 Microsoft Store 或 WinGet 装回来。官方明确点出两个例外——Microsoft Store 本身和 XboxSpeechToTextOverlay，前者卸了要靠系统命令重装。还有一点容易误解：注册表备份只恢复被改的设置，不会把卸掉的应用装回来，这两件事得分开做。

### 5. 面向装机与批量部署

给一台机器清理是一次性劳动，给一批机器清理才需要工具化，这部分能力在脚本里给得比较足。

`-Sysprep` 走的是系统封装模式，把用户级改动写进 Windows 默认用户配置文件，之后新建的账户自动继承；`-User` 可以把改动应用到另一个账户上，前提是该账户至少登录过一次且当前没在登录；`-AppRemovalTarget` 支持 `AllUsers` 和 `CurrentUser`，不填时默认对所有用户移除应用。开始菜单的固定项布局可以整体替换：`-ReplaceStart` 和 `-ReplaceStartAllUsers` 接收一个 `start2.bin` 模板文件，就能把自定义的磁贴布局铺到别的机器上。

多语言也是这一版的重点，2026.10.30 版把界面本地化做完了，`Config/Languages` 下现在有 13 种语言，包括简体中文和繁体中文。日志默认写到 `%LOCALAPPDATA%\Win11Debloat\Logs`，可以用 `-LogPath` 改位置；上次使用的设置存在同目录的 `LastUsedSettings.json`。

## 二、适合哪些使用场景？

- **刚重装完系统：** 想在上手第一小时把预装应用、遥测、推荐内容一次性处理掉，而不是用几个月慢慢被广告烦到。
- **给家里人装机：** 长辈或孩子用的机器不需要 Copilot、Recall、资讯小部件和游戏录制，默认模式基本覆盖这类需求。
- **公司或工作室批量部署：** 用 Sysprep 模式把设置固化到默认配置文件，新账户自动继承；或用 `-Config` 加 `-Silent` 做无人值守。
- **多台机器保持同一套习惯：** 关掉鼠标加速、恢复 Win10 右键菜单、显示文件扩展名、任务栏左对齐这类个人偏好，导出配置后可以复制到别的机器。
- **想减少 Windows 与 Edge 的广告和 AI 推送：** 设置首页的 365 广告、Edge 的资讯流、锁屏提示、Paint 与记事本里的 AI 功能都有对应开关。
- **在意可回滚：** 需要改之前留还原点和注册表备份，出问题能退回原状。

如果只是嫌一两个应用碍眼，直接在「设置 → 应用」里卸载更快，不必为一件事引入一个会改注册表、还会重启资源管理器的脚本。

## 三、优点与注意事项

**优点**

1. 免费开源，MIT 许可，仓库 63,545 星、2,838 个 fork，2020 年建仓至今持续更新，最新版本 2026.10.30。
2. 覆盖面扎实：170 款可移除应用、106 项可调设置、12 个分类，清理范围从应用一直延伸到任务栏、资源管理器、Windows 更新和 AI 功能。
3. 三种用法并存：图形界面适合普通用户，CLI 菜单适合看一眼再决定，参数化加 `-Silent` 适合脚本化。
4. 回滚链路完整：还原点、注册表备份、开始菜单布局备份三条线都有，且都有对应的界面入口。
5. 卸载走 Appx 和 WinGet 官方通道，不是删目录；绝大多数应用能从商店装回来。
6. 中文界面已就位，脚本本身是纯文本 PowerShell，能读能审，不必信任一个黑盒安装包。

**需要留意**

1. 必须用 Windows PowerShell 5.1 运行。源码里有一段明确的判断：在 PowerShell 7（Core / pwsh）下，Appx 模块会报「Operation is not supported on this platform」，脚本会直接退出并提示改用 `powershell.exe`。这条是 issue #675 之后加的硬性保护，别用 pwsh 跑。
2. 需要管理员权限，启动时会弹 UAC；非管理员运行会被拦下并询问是否提权重启。
3. 部分设置通过策略实现，官方文档在这些条目上写明「uses policies, which will lock down certain settings」——意味着对应选项在系统设置里可能变灰或被策略接管，之后想手动改回来会被覆盖，需要先用脚本取消勾选。
4. 注册表备份不包含应用恢复。恢复备份后，之前卸掉的应用仍然是卸掉的，要自己从商店或 WinGet 装回来。
5. Microsoft Store 本身和 XboxSpeechToTextOverlay 属于「卸了不好装回来」的例外，勾选时别手快。
6. `-ForceRemoveEdge` 官方标为不推荐，会保留 Core、WebView 和更新组件，但仍可能影响依赖 Edge 的功能，非必要不用。
7. 一键运行方式是 `irm` 拉远程脚本直接执行。这条路径最省事，但也等于把执行权交给网络，稳妥做法是先下载 Release 里的 zip、看一眼脚本再跑。官方 Release 附了 `SHA256SUMS`，可以校验。
8. 改动大多要重启资源管理器才生效，脚本会自动重启一次，用 `-SkipExplorerRestart` 可跳过，代价是得手动注销。

## 四、安装方式

### 一键运行

打开 PowerShell 或终端，粘贴下面这一行，脚本会自动下载并启动：

```PowerShell
& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))
```

支持在后面追加参数，例如只关遥测和 Bing 搜索、不弹任何提示：

```PowerShell
& ([scriptblock]::Create((irm "https://debloat.raphi.re/"))) -DisableTelemetry -DisableBing -Silent
```

### 手动下载运行

1. 到 [Releases 页面](https://github.com/Raphire/Win11Debloat/releases) 下载最新版的 `Win11Debloat.zip` 并解压。
2. 进入解压后的目录，双击 `Run.bat`。
3. 在 UAC 提示里允许以管理员身份运行。
4. 按界面提示勾选改动，确认后等待执行完成。

### 以管理员 PowerShell 运行

```PowerShell
Set-ExecutionPolicy Bypass -Scope Process -Force
cd C:\Win11Debloat
.\Win11Debloat.ps1
```

`-Scope Process` 只对当前窗口生效，关掉就恢复原策略，不用改全局设置。想走控制台菜单而不是图形界面，加 `-CLI`：

```PowerShell
.\Win11Debloat.ps1 -CLI
```

想先看看会改什么再决定，加 `-WhatIf` 预演一次。

## 五、综合评价

Win11Debloat 解决的是一个很具体的摩擦：Windows 的默认状态不是为用户配的，而是为微软的分发渠道配的，而清理这些默认项需要几十次点击和若干次"这个按钮为什么是灰的"的困惑。它把这些点击收敛成一次勾选，并且用还原点、注册表备份和应用重装三条路把风险兜住。

它的克制之处在于没有走"激进优化"路线。卸载走 Appx 和 WinGet 官方通道，改动大多是可逆的注册表项与策略，Edge 也只提供不推荐的强制移除选项，而不是默认干掉。对一个会碰系统注册表的工具来说，这种保守比功能多更值钱。

真正需要注意的是运行环境和策略类设置的副作用：必须用 Windows PowerShell 5.1、必须管理员权限、部分项会被策略锁定。把这几条记住，剩下的就是按需勾选。对刚装完系统、或者要批量布置几台 Windows 的人来说，它比手工清理省下的不只是时间，还有"到底改了什么"这件事的可追溯性。

**一句话评价：** 一个覆盖 170 款应用与 106 项设置、带回滚链路和中文界面的 MIT 开源 Windows 清理脚本，适合装机后一次性收拾干净，代价是要用对 PowerShell 版本并留意策略类改动。

---

*资料来源：*

- [Win11Debloat 官方 GitHub 仓库](https://github.com/Raphire/Win11Debloat)
- [Win11Debloat 官方 Wiki（文档首页）](https://github.com/Raphire/Win11Debloat/wiki)
- [默认设置与默认应用清单](https://github.com/Raphire/Win11Debloat/wiki/Default-Settings)
- [可移除应用完整清单](https://github.com/Raphire/Win11Debloat/wiki/App-Removal)
- [官方 Releases 与发布说明](https://github.com/Raphire/Win11Debloat/releases)
