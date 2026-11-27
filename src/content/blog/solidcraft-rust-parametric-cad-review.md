---
title: "SolidCraft：纯 Rust 写的开源参数化 CAD，改一个尺寸整条历史重算"
description: "SolidCraft 是用 Rust 写的开源参数化三维 CAD，支持草图约束、参数化时间线、钣金、二维工程图与 MCP。功能、限制、安装与适用场景评价。"
pubDate: 2026-11-27T16:09:11+08:00
tags: [开源软件, 效率工具, 工具]
---

![SolidCraft 建模工作区：左侧浏览器、中间三维视口、底部参数化时间线与装配关节轨](/GitBoy/images/solidcraft-rust-parametric-cad-review/01-ui-overview.jpg)

做结构件的人大概都遇到过这种返工：外壳板厚从 2 mm 改成 2.5 mm，螺柱、开孔、圆角、加强筋全得跟着重画一遍。参数化 CAD 存在的意义就是让这件事变成改一个数字——尺寸写进历史，模型按顺序重算。

问题在于可选方案太少。商业软件要授权费，Onshape 这类把模型放进浏览器和云端；开源这边最有名的 FreeCAD，功能覆盖很广，但装配和草图的工作流常被新手抱怨难上手。中间那块空档，一直有人想填。

**SolidCraft** 是一款用 Rust 写的开源参数化三维 CAD 应用，官方对自己的定位是「sketch, constrain, and build solids with a parametric feature timeline」：画草图、加约束、按时间线建实体，改尺寸后整个模型重算。它同时提供桌面版、浏览器版、无界面 CLI 和 MCP 服务器，四者跑的是同一套命令。

> 本文依据 SolidCraft 官方 GitHub 仓库、文档站 docs.solidcraft.io 与 v0.50.0 发布说明整理，界面截图取自官方文档与代码仓库。文中不含本机逐项实机测试，功能状态、性能数字与兼容性均以官方说明为准，属资料型评价。

## 一、核心功能

### 1. 草图与约束：几何求解器是自己写的

草图层支持直线、矩形、圆、圆弧、多边形、腰形槽、椭圆、样条、圆锥曲线和文字，另有构造几何、投影、修剪、草图内的圆角与倒角。约束齐全到有点意外：重合、点在线上、水平/垂直、平行、垂直、相切、曲率连续（G2）、相等、同心、共线、中点、对称、固定，尺寸里还有半径、直径、角度、弧长和槽长。

值得单独说的是求解方式。官方文档写明它没有套用现成的约束求解库：约束确定相对已知几何固定的点，用轨迹交点与刚性簇分解（文中注明参考 Owen 1991、Fudos–Hoffmann 1997）直接算出精确位置，其余交给 Levenberg–Marquardt 迭代，再用雅可比矩阵的秩给出剩余自由度。过约束的编辑会被拒绝，完全约束的几何会变黑。

![草图编辑中：尺寸标注与「fully constrained」状态提示](/GitBoy/images/solidcraft-rust-parametric-cad-review/02-sketch-constraints.jpg)

对做零件的场景，这套组合的价值在于「改得动」：把 60 mm 改成 55 mm，草图重新求解，后面的拉伸和孔位跟着走，不需要回头找哪条线漏了约束。

### 2. 参数化时间线与配置

特征放在一条可编辑的时间线上：拉伸、旋转、扫掠、放样、圆角/倒角、抽壳、拔模、孔、螺纹、阵列、镜像、分割、组合、移动。每个特征能改名、抑制、删除、调整顺序，时间线增量重算而不是整体重建。

参数支持带单位的表达式，比如 `2 * width + 5 mm`、`angle / 2`，可以定义用户参数，也能在配置表里按行切换不同的尺寸组合、特征抑制状态和每行的材料/外观。做系列化零件（同一款外壳的三种高度）时，这套配置比复制三份文件更好维护。

官方在能力文档里给了一个可核对的量化说法：76 个公开参考零件中有 75 个的体积、表面积、质心与包围盒和解析解或 FreeCAD 计算结果一致，剩下一个是已知 bug。这个数字同时也说明了边界——文档自己强调，这些检查不构成完整几何等价性证明，「对简单零件来说早期但可用」。

### 3. 装配、钣金与二维工程图

装配支持嵌套组件与实例、关节、运动仿真、接触集、干涉检查和考虑材料的质量属性。截图里可以看到装配关节单独成轨，和建模特征轨并排放在时间线上。

钣金是另一个完整模块：翻边、卷边、折弯/展开/重新折叠、材料切除、展开图、精确到直线/圆弧/圆的 DXF 轮廓和折弯表；塑料件的外壳特征与规则也在里面。

![钣金模块：翻边参数面板与展开图条目](/GitBoy/images/solidcraft-rust-parametric-cad-review/03-sheet-metal.jpg)

二维工程图这块，很多开源 CAD 是缺的。SolidCraft 有独立的 Drawing 工作区：基础视图、剖视、局部放大、断裂视图、对齐视图、插入图片、图纸草图、剖面线，以及标注、零件明细表和修订表；导出 PDF 时文字是真实文本而不是转成轮廓线（有开关可以保留旧的轮廓线行为）。它还带一个「Ready to issue」自检：所有视图是最新的、尺寸都有解、没有丢失的注释和气球、标题栏填写完整，四项都过才允许出图。

![图纸工作区的出图自检：「Ready to issue」四项检查与标题栏、明细表](/GitBoy/images/solidcraft-rust-parametric-cad-review/04-drawing-sheet.jpg)

### 4. 曲面、渲染与文件交换

曲面侧支持旋转曲面、扫掠、放样、偏移、直纹面和延伸，且曲面体保持为曲面（没有体积），需要布尔运算时先用 Stitch 缝合为实体。看曲面的边界方法很简单：仓库 `docs/screenshots` 下有一组以 `class-a` 命名的样例图，展示的是光顺过渡的曲面体，而不是靠贴图糊过去的成品渲染。

渲染是集成在视口里的不透明 PBR：金属比例、粗糙度、介电 IOR，可导出 CPU 预览 PNG。但别把它当渲染器——能力文档写得很直白：固定直接光照只是预览，HDRI、折射和贴图都还没实现。

![曲面样例：光顺过渡的封闭曲面体](/GitBoy/images/solidcraft-rust-parametric-cad-review/05-class-a-surface.jpg)

文件交换的覆盖面在同类开源项目里算宽的：STEP 按 AP242 导出（带实体名、颜色，组件按装配导出），导入支持 AP203/AP214/AP242；IGES 5.3、3MF、STL（二进制/ASCII）、OBJ、GLB/glTF 进出；装配带关节可导出 URDF 给机器人仿真，0.50.0 又加了 MuJoCo 的 MJCF；当前视图可导出 DXF（隐藏边省略或虚线）。此外还能导入 KiCad 板（内层铜箔按深度摆放，castellated 孔切成半孔），以及通过 cadmpeg 导入 FreeCAD 的 `.FCStd` 和 Rhino 的 `.3dm`，FreeCAD 文件里的草图、凸台、凹槽、旋转等还能还原成可编辑特征。

### 5. 四个入口：桌面、浏览器、CLI 与 MCP

桌面端是 egui + wgpu，界面有工具栏、浏览器树、时间线、三维视口、草图工具、特征对话框和命令面板，另有一条 JSON-lines 控制通道给测试和 agent 用。

浏览器版是同一套代码编到 WebAssembly，首选 WebGPU，缺 WebGPU 或表现异常时可用 `?webgl` 强制走 WebGL2；首次访问后会缓存，离线可用，也能从 Chrome/Edge 装成独立窗口的应用。设计存在浏览器的私有文件存储里，所以需要 HTTPS 或 localhost。

CLI（`solidcraft-cli`）能跑 JSON 命令脚本、量体积/面积/质心/面边点数量、导出、渲染 PNG 快照。MCP 是 `solidcraft-cli mcp`，无界面会话自己开一份设计，加 `--connect` 则驱动正在运行的桌面应用、过程可见。接 Claude Code 一行就够：

```
claude mcp add solidcraft -- solidcraft-cli mcp
```

插件系统是实验状态：加载 WebAssembly 组件，用 WIT 包 `craft:plugin@0.2.0`、能力 `commands@0.2`，安装、启用、打开设计都不会执行插件代码，必须先 `plugin.inspect` 拿到内容哈希再显式运行，并用 fuel、内存、死时间三重上限约束。0.x 阶段小版本可能破坏兼容，官方也照实写了。

## 二、适合哪些使用场景？

- **做小批量结构件和外壳：** 手边没有商业 CAD 授权，又需要一个能改尺寸、能出 STEP 给加工厂的环境。
- **需要二维工程图：** 不只是看模型，还要出带标题栏、明细表、修订表的图纸和 PDF。
- **参数化系列件：** 同一款零件多个规格，用参数和配置表管理，而不是复制多份文件。
- **想让 AI 参与建模：** 通过 MCP 让 agent 建模、量尺寸、导出，人再在界面里复核。
- **多平台混合环境：** 办公室 Windows、家里 Mac、服务器 Linux，甚至 FreeBSD，想用同一个工具。
- **教学与自学者：** 免费、可读源码、文档密度高，适合理解 B-rep 和约束求解是怎么回事。

反过来，如果你要做复杂曲面外观件（A 级曲面、大量 G2 连续过渡）、需要成熟的 CAM/模流/仿真，或者团队已经在用 SolidWorks 且有一套 PDM 流程，现在换过来并不现实——这是个 0.x 项目，官方自己只说「对简单零件早期但可用」。

## 三、优点与注意事项

**优点**

1. 免费开源，双许可 MIT OR Apache-2.0，界面代码也在开源范围内（品牌资源另按 LICENSE-BRAND 授权）。
2. 平台覆盖罕见地全：Windows x64/ARM64/x86、macOS 11+（通用二进制，Apple Developer ID 签名并公证）、Linux x86_64/aarch64（glibc 2.35+，AppImage/deb/rpm/Flatpak/Snap/tar 都有）、FreeBSD，外加浏览器版和可自托管的静态站点包，v0.50.0 一共 22 个包。
3. 参数化不是装饰：自研约束求解器、带单位表达式、配置表、可重排的时间线，这几样凑齐才算能干活。
4. 工程图和钣金做进去了，还带出图自检，这在开源 CAD 里少见。
5. 本地优先且有隐私说明：设计留在本机，联网行为只有每天一次的更新检查和可选的匿名使用统计，后者首次启动要明确点 OK 才开始，`DO_NOT_TRACK=1` 可关闭。
6. 文档密度高得反常：几何内核、渲染管线、性能预算、插件权限都有专门章节，连 macOS 更新失效、AppImageLauncher 冲突这类坑都写了。

**需要留意**

1. 太年轻。仓库 2026-10-07 才创建，当前 v0.50.0（2026-11-26），仍是 0.x，官方定位「早期但可用」；界面、文件格式、命令都可能变。
2. 提交与 issue 的数量值得冷静看待：约 16,400 次提交、370 位贡献者，同时挂着 6,600 多个未关闭 issue 和 770 个待合并 PR。这种密度说明推进快，也说明问题多，不适合把关键项目压上去。
3. 设计文件格式会前向不兼容：0.50.0 用 design format 69、drawing format 8，新版本存的图旧版本打不开（旧文件可在新版打开）。跨版本协作要先统一版本。
4. Windows 安装包还没签名（官方说正在接入 SignPath Foundation 的免费签名），SmartScreen 会拦，需要「更多信息 → 仍要运行」。
5. 体积不小：Windows 安装包 165.7 MiB，macOS 通用 dmg 502.2 MiB，Linux AppImage 约 198 MiB。
6. Snap 包要 `--dangerous` 装且不自动更新；应用 ID 从 `ai.storyteller.solidcraft` 改成了 `io.tangencylabs.solidcraft`，老 Flatpak 用户要走一次替换。
7. 渲染能力有限：没有 HDRI、折射和贴图，出效果图还是得靠别的工具。
8. 浏览器版依赖 WebGPU，老显卡要靠 `?webgl` 兜底；设计存在浏览器私有存储里，换浏览器等于换工作区。

## 四、安装方式

### macOS

打开 dmg 把应用拖进 Applications 即可，包里带公证票据，正常双击不会被拦。也可以用 Homebrew：

```
brew install --cask tangency-labs/tap/solidcraft
```

命令行工具单独发在 `solidcraft-cli-0.50.0-macos-universal.zip` 里。

### Windows

下载 `solidcraft-0.50.0-windows-x64.msi` 安装，或用免安装的 portable zip（x64/x86/ARM64 都有）。未签名，SmartScreen 提示时选「更多信息」→「仍要运行」。企业环境另有 Intune 和组策略模板。

### Linux

```
# AppImage
chmod +x solidcraft-0.50.0-linux-x86_64.AppImage
./solidcraft-0.50.0-linux-x86_64.AppImage

# 本地 Snap 包（不自动更新）
sudo snap install --dangerous ./solidcraft-linux-x86_64.snap

# Flatpak
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak remote-add --user --if-not-exists solidcraft https://docs.solidcraft.io/flatpak/solidcraft.flatpakrepo
flatpak install --user solidcraft io.tangencylabs.solidcraft
```

也可以直接用 deb/rpm/tar.gz。AppImage 首次运行会在 `~/.local/share` 写菜单项和图标，不想要就建个空文件 `~/.local/share/solidcraft/no-desktop-integration`。

### 浏览器与自托管

打开 [solidcraft.io/app](https://solidcraft.io/app) 就能用，`?sample` 直接加载示例零件。想自己托管，发布页里有一个 `solidcraft-web-0.50.0.zip` 静态站点包。

### 从源码构建

需要 Rust 工具链：

```
cargo run --release -p solidcraft -- --sample      # 桌面版，加载示例零件
cargo run --release -p solidcraft-cli -- commands  # 命令清单
cargo run --release -p solidcraft-cli -- run examples/bracket.json --out bracket.step
```

官方项目地址：[github.com/tangency-labs/solidcraft](https://github.com/tangency-labs/solidcraft)

## 五、综合评价

SolidCraft 的野心不小：一个纯 Rust 实现的参数化 CAD，自己写几何内核（SolidCore，NVIDIA 开源 SMLib 的 Rust 移植，独立仓库 Apache-2.0 开源）、自己写约束求解器、自己画 UI，然后把桌面、浏览器、CLI、MCP 四个入口统一到同一套命令上。这个组合在 2026 年的开源 CAD 里确实少见，它踩的也正是 FreeCAD 最被诟病的那些点——装配工作流、草图约束的反馈、工程图。

但这不是一个可以立刻替代主力工具的东西。仓库刚满两个月，7,400 多个未关闭 issue，文件格式还在 69 版、版本号还是 0.50.0，官方原话是「对简单零件早期但可用」。它现在最适合的位置是：一个能真正跑起来的第二工具——用来做外壳、支架、简单装配，快速出 STEP 和图纸；顺便观察一个用 Rust 重写 CAD 的路线能走多远。

值得试，但别把交付压在它身上。想先看再装的话，浏览器版零成本，打开就能画一个带参数的方块，比读十篇评测都直观。

**一句话评价：** 一个两个月就做到能用、平台覆盖极全、参数化和工程图都不缺的 Rust 开源 CAD，适合当第二工具和观察样本，还不适合当唯一的生产力工具。

---

*资料来源：*

- [SolidCraft 官方 GitHub 仓库](https://github.com/tangency-labs/solidcraft)
- [SolidCraft 官网](https://solidcraft.io)
- [SolidCraft 官方文档站](https://docs.solidcraft.io/)
- [SolidCraft Releases（v0.50.0）](https://github.com/tangency-labs/solidcraft/releases)
- [SolidCore 几何内核仓库](https://github.com/tangency-labs/solidcore)
- [MIT 许可证原文](https://github.com/tangency-labs/solidcraft/blob/main/LICENSE-MIT)
