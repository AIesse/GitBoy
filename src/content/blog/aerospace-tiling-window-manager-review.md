---
title: "AeroSpace：用 i3 的思路管理 macOS 窗口"
description: "macOS 平铺窗口管理器 AeroSpace：树状平铺、自建工作区、TOML 配置与 CLI 集成，附缺点、适用场景和安装方式。"
pubDate: 2026-11-22T16:06:24+08:00
tags: [macOS, 效率工具, 开源软件]
---

![AeroSpace 的窗口树：横向容器里嵌着一个纵向容器](/GitBoy/images/aerospace-tiling-window-manager-review/01-window-tree.jpg)

macOS 的窗口管理一直停在“手动摆”的阶段。想把终端放左边、编辑器放右边，得拖边框、对齐、再来一遍；绿色按钮的全屏会把窗口推进另一个 Space，切回来还有一段动画。窗口一多，桌面就变成叠罗汉，每次找窗口都靠 `cmd + tab` 轮询和肌肉记忆。

**AeroSpace 是一款面向 macOS 的平铺窗口管理器，用 i3 的树结构来组织窗口：窗口不重叠，按容器和方向自动铺满屏幕，工作区由软件自己实现，不依赖 macOS 原生 Spaces。** 项目用 Swift 编写，MIT 许可，作者是 nikitabobko，仓库定位是“i3-like tiling window manager for macOS”。

> 本文依据 AeroSpace 官方仓库 README、官方 Guide 与 Commands 文档、Releases 发布说明及 LICENSE 整理（文档读取时间 2026-11-22），属于资料型评价。文中功能与行为均引自官方文档与发布说明，作者未在本机逐项实机操作；若与你的实际版本不符，以官方文档和当前版本为准。

## 一、核心功能

### 1. 树状平铺：容器、方向与四种布局

AeroSpace 的所有窗口和容器都存在一棵树里，这套模型官方写明是“inspired by i3”。规则不复杂：每个工作区有自己的根节点；每个非叶子节点叫容器（Container），可以挂任意数量的子节点；窗口只能是叶子节点，不再有子节点。容器带两个属性——布局（`tiles` 或 `accordion`）和方向（`horizontal` 或 `vertical`）。我们平时说的“某个窗口的布局”，指的是它父容器的布局。

布局一共四种：`h_tiles`（横向平铺，对应 i3 的 horizontal split）、`v_tiles`（纵向平铺）、`h_accordion`（横向手风琴，对应 i3 的 tabbed）、`v_accordion`（纵向手风琴，对应 i3 的 stacked）。容器可以无限嵌套，用 `focus left|down|up|right` 在四个方向间移动焦点。改变树结构主要靠三条命令：`move`、`join-with`、`split`（官方注明 `split` 只是为了兼容 i3，推荐用 `join-with`）。

![两个窗口横向平铺，右侧是对应的树结构](/GitBoy/images/aerospace-tiling-window-manager-review/02-horizontal-tiles.jpg)

为了让“看屏幕就能看懂树”，AeroSpace 默认开两种归一化：只含一个子节点的容器会被拍平（根节点例外，允许只挂一个窗口）；相互嵌套的容器方向必须相反，`h_tiles` 里直接套 `h_tiles` 会被自动改成 `v_tiles`。两条都能在配置里关掉，但官方建议除非你是很清楚自己在做什么的 i3 老用户，否则保持开启。

手风琴布局是窗口叠在一起，靠两侧或上下的留白提示旁边还有窗口：横向手风琴留左右 padding，纵向手风琴留上下 padding。横向手风琴用 `focus left/right` 翻，纵向用 `focus up/down` 翻，padding 大小由 `accordion-padding` 控制，默认配置里是 30，设成 0 就关掉。

![横向手风琴布局：焦点窗口左右留出窄条，提示还有其它窗口](/GitBoy/images/aerospace-tiling-window-manager-review/03-horizontal-accordion.jpg)

### 2. 自建工作区：绕开 macOS Spaces

这是 AeroSpace 最“不客气”的设计。官方文档直接列了原生 Spaces 的几个问题：切换动画慢且关不掉（只能靠“减弱动态效果”稍微快一点）、单显示器最多 16 个 Spaces、无法用快捷键创建/删除/排序 Space 或把窗口移进移出、Apple 也没提供对应 API。

于是 AeroSpace 自己实现了一套，叫 Workspace。原理很朴素：工作区不活跃时，它里面的窗口被挪到屏幕可见区域之外，也就是右下角或左下角；切回该工作区时（`workspace` 命令，或者 `cmd + tab`），窗口再挪回来。当前活跃工作区的名字显示在菜单栏托盘图标上，作为视觉反馈。退出或检测到即将崩溃时，AeroSpace 会把所有窗口放回可见区域。

代价也写在文档里：macOS 不允许窗口完全移出可见区域，所以隐藏的窗口会在屏幕角落留一条 1 像素的竖线；如果 AeroSpace 崩得比较彻底，可以手动把这些像素拖回屏幕中间找回窗口。官方建议把 Dock 放底部并开启自动隐藏，减少这条线的存在感。另外显示器排布要留出角落空白——每台显示器右下角或左下角至少有一个是空的，否则会在别的显示器上看到隐藏窗口的边缘。官方还给了一个 Mission Control 的偏方：开启“按应用程序分组窗口”（`defaults write com.apple.dock expose-group-apps -bool true && killall Dock`），否则 Mission Control 里窗口会缩得很小。

多显示器上，工作区池是共享的：每台显示器显示自己的工作区，同一个工作区不能同时出现在两台显示器上，每个工作区（哪怕是空的、不可见的）都绑定一台显示器。默认全部绑到“主显示器”，也可以用 `workspace-to-monitor-force-assignment` 按序号、`main`、`secondary` 或显示器名称的正则来固定。

### 3. TOML 配置与绑定模式

配置是纯文本 TOML（1.1.0 格式），两个位置二选一：`~/.aerospace.toml`，或 `${XDG_CONFIG_HOME}/aerospace/aerospace.toml`（没设 `XDG_CONFIG_HOME` 时回落到 `~/.config`）。两处同时存在会报歧义。找不到自定义配置就用内置默认配置。

回退规则值得记住：标量类配置项没写就用默认值；列表/表类配置项没写就是空的，`mode.*.binding` 尤其如此——键盘绑定以你的配置为唯一来源，想让哪个键生效就必须显式写出来。目前最高配置版本是 `config-version = 2`，它解锁了显式写 `persistent-workspaces` 的能力，也把该选项的默认值改成空数组（版本 1 时会从按键绑定的右侧推断，官方承认那样容易出错）。

绑定模式（binding modes）和 i3 一样：可以有 main、resize 等多套绑定，切换模式后当前模式的绑定全部失效，只有新模式的生效，启动时的初始模式是 `main`。

```toml
[mode.main.binding]
    alt-r = 'mode resize'          # 切到 resize 模式
    alt-1 = 'workspace 1'
    alt-shift-1 = 'move-node-to-workspace 1; workspace 1'

[mode.resize.binding]
    minus = 'resize smart -50'
    equal = 'resize smart +50'
```

绑定值可以是一串命令，AeroSpace 自己实现了一个 shell 子集：支持 `;`、`||`、`&&`、`|` 和括号，其中 `&&` 的结合力比 `||` 强（官方特意说明这与传统 shell 不同，`foo || bar && baz` 会被解析成 `foo || (bar && baz)`），管道符的语义等同于 shell 的 `set -o pipefail`。所以下面这种“只在不空的显示器工作区之间循环”的写法是成立的：

```toml
alt-right = 'list-workspaces --monitor focused --empty no | workspace --stdin next'
```

键位默认按 qwerty 理解，dvorak 和 colemak 用户可以直接 `key-mapping.preset = 'dvorak'`，也可以自定义别名做 key mapping。间距用 `gaps.inner.*` 和 `gaps.outer.*` 控制，支持按显示器给不同值。

### 4. CLI 与 socket：可以脚本化

AeroSpace 是“CLI first”的：安装包里带 `aerospace` 命令行工具、manpage 和 bash/fish/zsh 补全。命令文档里列了四十余个子命令，查询类的有 `list-windows`、`list-workspaces`、`list-monitors`、`list-apps`、`list-modes`、`list-exec-env-vars`、`debug-windows`；操作类的有 `workspace`、`move-node-to-workspace`、`move-node-to-monitor`、`focus`、`resize`、`layout`、`close`、`fullscreen`、`balance-sizes`、`flatten-workspace-tree`；还有 `eval`、`exec-and-forget`、`subscribe`、`trigger-binding` 这类把命令当积木用的。

同一条命令既能写进配置绑定，也能直接在终端敲：

```bash
aerospace workspace 1
aerospace list-windows --workspace focused
aerospace layout --workspace 2 --root v_tiles
```

官方文档还公开了 CLI 与 App 之间的 socket 协议：Unix domain socket 放在 `/tmp/bobko.aerospace-${USER}.sock`，连上后先做一次 4 字节版本握手（当前只有版本 1），之后每条消息是“4 字节长度 + UTF-8 JSON”的帧，普通命令一问一答，`subscribe` 则变成事件流。这意味着状态栏、编辑器插件或任何语言写的自定义客户端都能直接接入，不必依赖 `aerospace` 这个壳——文档里给了一段几十行的 Python 客户端示例。

### 5. 回调：把规则写成配置

比命令更好用的是回调。`on-window-detected` 是一个有序列表，每个元素有 `if` 和 `run` 两个必填项；新窗口出现时按顺序执行 `if`，退出码为 0 就执行 `run` 并停止继续匹配，非 0 则看下一条；想让后续回调继续跑，加 `check-further-callbacks = true`。`if` 里通常用 `test`、`test-not`、`true`、`false` 这几个辅助命令，最常匹配的是 app bundle id。

```toml
on-window-detected = [
    { if = 'test %{app-bundle-id} = org.alacritty', run = 'move-node-to-workspace T' },
    { if = 'test %{app-bundle-id} = com.google.Chrome || test %{app-bundle-id} = org.mozilla.firefox', run = 'move-node-to-workspace W' },
    { check-further-callbacks = true, run = 'layout floating' },
]
```

焦点类回调有两个：`on-focus-changed`（窗口或工作区焦点变化时触发）和 `on-focused-monitor-changed`（焦点显示器变化时触发）。官方给的典型用法是配 `move-mouse` 实现“鼠标跟随焦点”，默认配置里就带了一条 `on-focused-monitor-changed = ['move-mouse monitor-lazy-center']`。`exec-on-workspace-change` 则用于对接状态栏，会把 `AEROSPACE_FOCUSED_WORKSPACE` 和 `AEROSPACE_PREV_WORKSPACE` 传进子进程，配 SketchyBar 的示例在 goodies 文档里。

回调拿到的目标窗口也有讲究：AeroSpace 会给回调进程注入 `AEROSPACE_WINDOW_ID` 或 `AEROSPACE_WORKSPACE`（二选一），需要指定目标的命令会优先用它，所以“把新窗口移到工作区 2，再让它浮动”这两步都作用在同一个新窗口上，不会被中途的焦点变化带偏；`--window-id` 和 `--workspace` 参数可以进一步覆盖。

浮动窗口的处理靠启发式：Apple 提供了标记对话框的辅助功能 API，但很多 App 没实现或实现得不规范（官方举例，连 Finder 的复制进度窗都没标）。AeroSpace 会先问 API，再用启发式补：没有全屏按钮的窗口一般当作对话框（终端类除外），识别为对话框的默认浮动。识别错了可以用 `on-window-detected` 强制 `layout tiling` 或 `layout floating`。

![纵向手风琴布局](/GitBoy/images/aerospace-tiling-window-manager-review/04-vertical-accordion.jpg)

## 二、适合哪些使用场景？

- **键盘优先、长期同时开一堆窗口：** 终端、编辑器、浏览器、文档一起开，希望位置由规则决定而不是每次手动摆。
- **多显示器用户：** 需要把工作区固定到某块屏、按显示器分配布局，而不是靠拖动窗口跨屏。
- **被原生 Spaces 限制卡住：** 工作区需求超过 16 个，或者受不了切换动画和“不能用快捷键创建/排序 Space”。
- **把配置当 dotfiles 管理：** 希望窗口布局和快捷键跟 vim、zsh 配置一起进版本库，换机器一条命令还原。
- **需要脚本化和集成：** 想把窗口状态喂给自己的状态栏，或者用脚本按项目切换工作区。
- **不适合：** 平时只开两三个窗口、习惯鼠标拖拽的人；需要图形化设置界面的；在意窗口圆角、边框、透明、动画这类外观效果的——官方明确写了不提供 GUI 配置，ricing 只保留 gaps 和少量回调，相关需求基本不受理。

## 三、优点与注意事项

**优点**

- **不要求关闭 SIP。** 官方说明只用了 `_AXUIElementGetWindow` 一个私有 API，其余都走 macOS 公开的辅助功能 API，目标是能扛住系统更新、长期可维护。
- **工作区切换没有动画、没有 16 个上限。** 因为是软件自己挪窗口，切工作区就是瞬间的事，工作区数量也不受系统限制。
- **纯文本配置，dotfiles 友好。** TOML + 命令行 + 补全 + manpage，配置能直接进 Git。
- **树模型行为可预测。** 归一化保证了“屏幕上的样子”和“树的结构”对得上，不会出现视觉上平级、实际嵌套两层的情况。
- **可脚本化的接口够彻底。** 四十余个命令、公开的 socket 协议、`subscribe` 事件流，集成面比多数同类工具宽。
- **项目活跃、社区规模不小。** 截至 2026-11-22，仓库 23,914 star、819 fork、265 个未关闭 issue，50 余名贡献者，最近一次提交在 2026-11-13；MIT 许可，代码是 Swift。

**注意事项**

- **仍是 Public Beta。** README 写明“可以作为日常主力，但 1.0 之前会有破坏性变更”，最新发布版本是 v0.21.3-Beta（2026-07-16）。版本号没到 1.0，配置和 CLI 都可能变。
- **没有 Apple 公证。** README 里作者明确说不会去走公证流程。手动装 zip 会遇到“无法验证开发者”，需要 `xattr -d com.apple.quarantine` 或右键打开；用 Homebrew cask 安装则由安装脚本自动去掉 quarantine 属性。
- **要改掉使用 Spaces 的习惯。** 官方建议只保留一个 macOS Space（多显示器时按屏幕数量保留），不再和原生 Spaces 交互。隐藏窗口会留 1 像素，显示器排布不对还会在别的屏幕上露边。
- **多显示器的取舍。** 文档建议关闭“显示器具有单独的空间”，理由是公开 API 在开启时会有焦点错乱和性能问题；但关掉之后，一台显示器进原生全屏，另一台会变成不可用的黑屏。要不要关，取决于你用不用原生全屏。
- **只支持 macOS 13 及以上。** 编译要求更高，官方 CI 最低在 macOS 15 上构建。Windows 和 Linux 用户直接排除。
- **快捷键冲突要自己排查。** 官方专门列了这条：如果某些键在配置里怎么写都不生效，先看是不是被 skhd、Karabiner-Elements、Raycast 之类的全局热键工具先截走了。

## 四、安装方式

### 1. Homebrew（官方推荐）

走官方 tap 装 cask，能拿到自动更新：

```bash
brew install --cask nikitabobko/tap/aerospace
```

需要固定旧版本时，tap 里保留了带版本号的 cask：

```bash
brew install --cask nikitabobko/tap/aerospace@0.12.0
```

补全需要按 Homebrew 的说明在 shell 里配置（bash、fish、zsh 三种都有提供）。

### 2. 手动安装 zip

1. 从 Releases 页下载对应版本的 zip；
2. 解压，把 `AeroSpace.app` 放进 `/Applications`；
3. 想要命令行工具，把 `bin/aerospace` 放到 `$PATH` 里的任意位置（可选，只影响 CLI 交互）。

如果提示“无法打开，因为 Apple 无法检查其是否包含恶意软件”，官方给两个解法：

```bash
xattr -d com.apple.quarantine /Applications/AeroSpace.app
```

或者在 Finder 里进 `/Applications`，右键 `AeroSpace.app` 选“打开”。

### 3. 配置初始化

先把默认配置复制出来，再按需改——默认配置本身就是官方文档的一部分，每个键都带注释：

```bash
cp /Applications/AeroSpace.app/Contents/Resources/default-config.toml ~/.aerospace.toml
```

改完可以让它自动重载（`auto-reload-config = true`，首次需要手动重载一次才生效），或者手动执行：

```bash
aerospace reload-config
```

想开机自启，配置里 `start-at-login = true`；想在启动时给不同工作区定初始布局，用 `after-startup-command`，例如 `['layout --workspace 2 --root v_tiles', 'layout --workspace 3 --root h_accordion']`。

## 五、综合评价

AeroSpace 解决的问题很具体：macOS 没有窗口平铺，而现成的替代方案要么依赖私有 API 和关闭 SIP（yabai 那条路线），要么只能在“自动布局”和“手动摆放”之间二选一。它选了第三条路——把 i3 的树模型搬过来，用公开的辅助功能 API 实现，再用软件自己模拟的工作区绕开 Spaces 这个雷区。

这个取舍的代价是明确的：你不能再依赖原生 Spaces，隐藏窗口会留 1 像素，多显示器要按它的规则排布，配置全靠文本文件。收获也明确：工作区切换瞬间完成、数量不受限、布局和快捷键可以进版本库、整套操作能被脚本和状态栏接管。对一个每天开几十个窗口的人来说，这些收益通常大于那点别扭。

需要提醒的是它的成熟度。项目自己标着 Public Beta，版本还在 0.21.x，官方直言 1.0 前会有破坏性变更，配置格式和命令都可能调整；也没有 Apple 公证，安装时需要手动处理隔离属性。这些不是缺陷，而是它当前阶段的属性——用之前要接受“配置可能得跟着版本改”这件事。

如果你的日常工作就是键盘 + 多窗口，并且愿意花半小时把 `~/.aerospace.toml` 调成自己顺手的样子，AeroSpace 值得装上试一周。如果只是偶尔开两个窗口、或者需要图形化设置界面，那它带来的学习成本会高于收益，macOS 自带的窗口管理够用了。

**一句话评价：** 一款用 i3 树模型重做 macOS 窗口管理的开源工具，不要 SIP、不要 GUI、工作区自己实现，代价是要改掉用 Spaces 的习惯并接受 Beta 阶段的变动。

---

*资料来源：*

- [AeroSpace 官方 GitHub 仓库](https://github.com/nikitabobko/AeroSpace)
- [AeroSpace 官方 Guide 文档](https://nikitabobko.github.io/AeroSpace/guide)
- [AeroSpace 官方 Commands 文档](https://nikitabobko.github.io/AeroSpace/commands)
- [AeroSpace Releases 发布页](https://github.com/nikitabobko/AeroSpace/releases)
- [AeroSpace 的 MIT 许可证原文](https://github.com/nikitabobko/AeroSpace/blob/main/LICENSE.txt)
