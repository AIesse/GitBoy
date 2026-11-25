---
title: "GenOffice：直接改 docx、xlsx、pptx 的开源 AI 办公套件"
description: "Apache-2.0 的本地办公套件 GenOffice：六个编辑器共享一套引擎，保存只重写改动部分，AI 修改可回滚，另有 CLI 与 MCP 接入，附安装方式与注意事项。"
pubDate: 2026-11-25T16:06:14+08:00
tags: [效率工具, 开源软件, macOS]
---

![GenOffice 首屏：Docs、Sheets、Slides、PDF、Markdown、HTML 六个编辑器，以及内置的 AI 面板](/GitBoy/images/genoffice-ai-office-suite-review/01-hero.jpg)

一份合同只需要改两行字，用在线文档打开，页眉、页脚和分栏就散了；一份季度报表想转成 PDF，先要上传到某个网站；AI 能写出一段通顺的话，但贴回 Word 之后字体、缩进、编号还得手工重排。办公文件的麻烦往往不在内容，而在格式：谁改过、改在哪、还能不能还原。

**GenOffice 是 Genspark 开源的 AI 办公套件**，Apache-2.0 许可证，提供 macOS、Windows 和 Linux 客户端。它把 Docs、Sheets、Slides、PDF、Markdown、HTML 六个编辑器放进同一个外壳，共用一套文件引擎：打开和保存的都是原生 `.docx`、`.xlsx`、`.pptx`，PDF 能原地改字，Markdown 与 HTML 能导出成 Word。打开、编辑、保存和格式转换都在本机完成，只有 AI 请求会发给你自己选定的模型服务。

> 本文依据 GenOffice 官方 GitHub 仓库 README（英文版与简体中文版）、`packages/cli/README.md`、`PRIVACY.md` 以及 Releases 页面整理，界面截图取自官方仓库的 `docs/assets/readme`。截至 2026-11-25，最新版本为 v0.13.886（2026-11-24 发布）。本文属于资料型评价，没有对安装包做逐项实机测试，功能边界与限制以官方文档为准。

## 一、核心功能

### 1. 六个编辑器，一个外壳

按官方 README 的划分，GenOffice 由七个 Electron 应用组成：Docs、Sheets、Slides、PDF、Markdown、HTML 六个编辑器，加上负责多标签的 shell。它们共享一层纯 TypeScript 引擎包，`.xlsx` 另有一个 Rust sidecar 专门处理。

- **Docs**：打开 `.docx` 时按 Word 的版式渲染，双栏、满幅图片、带底纹的表格、页眉页脚都能保留；样式、批注、修订、公式、墨迹与内容控件往返不改。Mailings 标签能把文档变成合并模板：接 `.xlsx` 或 `.csv` 收件人列表，插入真正的 `MERGEFIELD`，逐条预览后合并成一份或多份文档。
- **Sheets**：官方称底层是自研的 Rust `.xlsx` 引擎，支持数据透视表、切片器、条件格式、公式追踪；图片可以作为 Excel 的原生富值嵌在单元格里，用 Excel 重新打开仍在格内。
- **Slides**：在画布上编辑，有母版、版式、智能参考线与非破坏性裁剪；插入 `.glb` 后是真正的 3D 模型，按 PowerPoint 的存储方式保存，在 PowerPoint 里打开仍是 3D。

![Slides：一句提示词生成的 11 页路演稿，左侧是缩略图，右侧 AI 面板列出它搭的故事线](/GitBoy/images/genoffice-ai-office-suite-review/04-slides.jpg)

![Docs 打开一份公司简介，AI 面板里能看到它读了哪些块、改了什么，底部有 Roll back](/GitBoy/images/genoffice-ai-office-suite-review/02-docs-ai.jpg)

旧格式走的是导入路线。Word 97–2003 的 `.doc`/`.dot`、Excel 97 的 `.xls`、旧版 `.ppt`、韩文 `.hwp`/`.hwpx`，以及 ODF 家族（`.odt`、`.ods`、`.odp` 与 `.ott`/`.ots`/`.otp` 模板），打开时会先在本机转成 `.docx`/`.xlsx`/`.pptx` 副本再编辑。官方写得很清楚：这是单向转换，保存只写 OOXML，不会回写源格式；`.ppt` 转换会带上母版、形状几何、填充、图片和文字格式，但备注、动画、切换与超链接目前不迁移。

### 2. 保存时只重写你动过的部分

这是 GenOffice 在技术上最值得看的一点，也是它以「Office 替代品」自居的底气。官方 README 给出的保存流程是：

```
open docx ─► archive original by hash (never touched)
          ─► parse word/document.xml into a block tree, each block anchored to its original XML
          ─► Tiptap editor (manual + AI editing, dirty tracking)
save      ─► dirty blocks → OOXML fragments (referencing existing styles only)
          ─► splice into the original document.xml; untouched blocks keep their bytes
          ─► repack the zip; every other entry is copied byte-for-byte
```

翻成中文：原文件按哈希归档、永不被改动；`document.xml` 被解析成块树，每个块锚定到它原本的 XML；保存时只有「脏」块重新生成 OOXML 片段，插回原文档，未改动的块保留原字节；重新打包 zip 时其余条目逐字节复制。所以一份别人发来的文档里，你没碰过的图表、批注和样式，不会因为换了个编辑器就悄悄变样。

代价同样明确：它只覆盖引擎能理解的块。文档里出现引擎不认识的结构，改动范围之外的内容是安全的，但你指望它精细编辑那一块就不现实。这是所有「部分重写」型编辑器的共同边界，不是 GenOffice 独有的问题。

### 3. AI 改的是文件本身，而且能审、能退

GenOffice 的 AI 面板不是挂在侧边的聊天框。按官方说明，AI 会读取它需要的块，直接改文档，改动以 Word 风格的修订（Track changes）或 diff 呈现；每一轮 AI 操作都是一个快照，可一键回滚，界面上就是 AI 面板底部那个 Roll back。Sheets 里 AI 生成的是 `SUMIF` 这类活公式和真正的图表，不是把算好的数字粘进去；Slides 生成的页面落在画布上，仍然可编辑。

![Sheets 里 AI 生成的汇总表：按区域和品类写 SUMIF，插入柱状图，43 处改动作为一批可撤销操作](/GitBoy/images/genoffice-ai-office-suite-review/03-sheets-ai.jpg)

还有个细节值得单独提：Docs 里选中的一段文字、或 Sheets 里选中的一片单元格，可以对模型隐藏，模型只会看到一个有名字的占位符，原文仍留在文件中。官方同时说明，这个隐藏只针对应用内的 AI——CLI、MCP 工具和无头导出直接读文件，照样能看到这些文字。这条限制写得很老实，值得记住：它防的是误发，不是权限控制。

### 4. PDF 原位改字，转换全在本机完成

PDF 编辑用的是 PDFium，官方描述是重写页面内容流、保留原有字体，而不是在上面盖一层注释框。截图里的 PDF 编辑器有 Annotate、Edit、Pages 三个标签，工具栏上直接给出 Edit text、Insert text 与 PDF Converter 三个入口。

![PDF 编辑器：顶部是 Annotate / Edit / Pages，左侧 AI 面板的回答带页码引用](/GitBoy/images/genoffice-ai-office-suite-review/05-pdf-edit.jpg)

转换方向包括 PDF → Word / Excel / PowerPoint（PDFium 字符级提取加基于几何的版面分析）、Markdown → Word、HTML → Word，全部在本机执行，不上传文件。扫描件在 macOS 和 Windows 上调用系统 OCR，所以转出来是可选中的文字，而不是整页图片。HTML 转 Word 会先在 Chromium 里渲染页面，再还原成标题、段落、列表、表格、表单域这些真正的 Word 结构，只有图表、图标这类 Word 没有对应物的视觉元素才作为图片嵌入。

### 5. 本地检索、Ask AI，以及终端与 agent 接入

首页的搜索不是文件名匹配，而是对工作目录里 `.docx`、`.xlsx`、`.pptx`、PDF、Markdown、HTML 的**正文**建 SQLite 全文索引，官方说明分词语法支持中日韩文字。在此之上还有一层可选重排：开启 Jev 重排后，本地排名前 20 的命中摘录会交给 TypeSafe Jev 打一个相关度分再排序，OpenRouter 上的模型名是 `typesafe/jev-1.13`。官方强调它默认关闭，开启后只有这 20 条摘录离开本机，索引本身不外传；请求失败或超时就保持本地顺序。

Ask AI 把标星的文件当作知识库：用自然语言提问，agent 检索并读取需要的文件，每条结论后面挂一个引用，点开就在对应的编辑器里打开原文件。

![设置页的 MCP 部分：Claude Code 用一行 claude mcp add，其他客户端填 JSON，路径指向应用内的 genoffice 可执行文件](/GitBoy/images/genoffice-ai-office-suite-review/06-mcp.jpg)

对开发者更实用的是随应用安装的 `genoffice` 命令行。它不需要额外的运行时，同一套引擎在无头模式下跑：

```bash
genoffice info report.docx --json
genoffice convert report.md --to pdf
genoffice create --type xlsx --from table.json --out sales.xlsx
genoffice docs compare original.docx revised.docx --out redline.docx
genoffice render report.docx --out shots/
```

`docs compare` 输出的是带 Word 修订的 redline 文档，`render` 把每一页导出成 PNG 供检查。官方还提供 agent skill，支持 Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode 与 Windsurf；`genoffice mcp` 以 stdio 方式提供 29 个工具加 op 参考资源，应用内的 HTTP 服务器在 `127.0.0.1:3093/mcp`，可以让 agent 在你眼前把一份 Word 文档一行行写出来。

## 二、适合哪些使用场景？

- **经常收发 Word / Excel / PPT，又不想装 Office：** 手头是 Mac 或 Linux，只需要能正常打开、修改、保存原生格式。
- **在意格式完整性的文档：** 合同、标书、对外报表这类「改两行但不能动版式」的文件，字节级保存比重新排版省事。
- **要让 AI 参与写作但必须留痕：** 修订模式加逐轮快照，改坏了能退回去，比让模型直接覆写安全。
- **PDF 需要原地改字：** 改一页报价单上的数字、换一张图，不必回到源文档重新导出。
- **已经在用编码 agent：** 想让 Claude Code、Cursor 这类工具直接产出真正的 `.docx`、`.xlsx`、`.pptx`，而不是先写 Markdown 再指望人手工转换。
- **文档必须留在本机：** 编辑、保存、格式转换都不出机器，AI 走自己的 key 或兼容端点。

反过来，如果只是偶尔看一份 PDF、一年写两次 Word，系统自带的预览加文本编辑就够用，没必要为此装一个 Electron 套件。

## 三、优点与注意事项

**优点**

1. 免费且开源，Apache-2.0，官方 FAQ 明确：没有试用期，应用本身也没有付费档。
2. 格式策略扎实：原生 OOXML、字节级保存、旧格式与 ODF 本机转换，文件不上传。
3. AI 的定位清楚：改的是文档本体，带修订、快照与回滚，而不是聊完让人自己复制粘贴。
4. 平台覆盖完整：macOS（Apple Silicon / Intel）、Windows（x64 / Arm）、Linux（deb / rpm / AppImage），官方说明 macOS 与 Windows 安装包已签名。
5. 可编程性罕见：随应用附带的 CLI、agent skill 与 MCP 服务器，把六个编辑器的能力开放给脚本和编码 agent。
6. 文档齐全：英文 README 之外有简体中文等二十多种语言版本，CLI 有独立参考，隐私与安全各有单独文件。
7. 迭代很快：仓库 2026-07-31 创建，到 2026-11-25 已有 12,911 星、83 位贡献者、1,525 次提交，最新版本 v0.13.886（2026-11-24）。

**需要留意**

1. 版本号仍是 0.x，官方自称「正在积极开发中」，功能与界面都可能变；要在生产环境用，先拿副本试。
2. AI 功能需要联网，要么登录 Genspark 走它的代理，要么自备 API key。应用免费，模型调用按你自己账号计费。
3. 旧格式与 ODF 是单向导入，保存写 OOXML；`.ppt` 的备注、动画、切换、超链接目前不迁移。
4. 官方 FAQ 写明正式打包版本默认发送有限的使用统计，可在设置里关闭，统计不含文档内容、文件名、路径与账号身份。介意的话装完先去关掉。
5. Jev 重排默认关闭，开启后会把前 20 条命中摘录发给模型服务，这是「本地检索」唯一会让内容外发的环节。
6. 基于 Electron，七个应用共享一层引擎，功能密度高，但不是轻量工具；官方未公布内存占用指标，实际体感取决于同时打开的文档。
7. 与 Microsoft Office 的往返兼容性来自官方的字节级保存设计，本文未做独立兼容性测试。宏、外部链接、嵌入对象这类复杂文档，建议自己先用副本验证。

## 四、安装方式

### macOS

官方要求 macOS 11 及以上，分 Apple Silicon（arm64）与 Intel（x64）两种 `.dmg`，从 Releases 页面取最新版。安装包已签名。

### Windows

Windows 10 及以上用 x64 安装器；Windows 11 on Arm（骁龙 X 一类）用 arm64 安装器。同样在 Releases 页面下载。

### Linux

deb 与 rpm 要求 x86_64 与 glibc 2.34+（Ubuntu 22.04 起、Fedora 35+、RHEL 9+、Leap 15.6+）：

```bash
sudo apt install ./genoffice_<version>_amd64.deb
sudo dnf install ./genoffice-<version>.x86_64.rpm
sudo zypper install ./genoffice-<version>.x86_64.rpm
```

其余发行版用 AppImage，需要 FUSE 2：

```bash
chmod +x GenOffice-<version>.AppImage
./GenOffice-<version>.AppImage
```

deb 与 rpm 还会给 KDE Dolphin 装上「新建 GenOffice 文档 / 表格 / 演示」的模板。Chromebook 的 Linux 环境（Crostini）也能跑同样的包。

### 配置 AI

两条路。一是登录 Genspark，模型调用走它的代理，顺带获得联网搜索与图片能力；二是自备 key，官方列出的供应商有 Claude、OpenAI、Gemini、DeepSeek、Kimi、GLM、Qwen、Doubao、MiniMax、Grok、Mistral、OpenRouter 等十余家，另有自定义槽位可填任意 OpenAI 兼容端点，本地模型服务器也算在内。不想用 AI，可以在设置里关掉侧栏。

### 从源码构建

```bash
npm install
npm run fixtures
npm test
npm run dev
npm run dist:mac   # 或 dist:win / dist:linux
```

Sheets 的 `.xlsx` sidecar 需要 Rust 工具链（`cargo` 在 PATH 里），构建 `@genoffice/sheets` 时会自动编译。

官方项目地址：[github.com/genspark-ai/genoffice](https://github.com/genspark-ai/genoffice)

## 五、综合评价

GenOffice 想解决的不是「AI 会不会写字」，而是「AI 写完之后，文件还能不能在 Word 里正常打开」。它的答案是把力气花在文件层：原生 OOXML、按块重写、旧格式本机转换、PDF 内容流重写，AI 只是叠在上面的一层可审、可回滚的编辑入口。这个顺序和市面上多数「AI 办公」产品正好相反——那些先做聊天，再把结果导出成一个勉强能看的文件。

取舍也很清楚。覆盖面很宽，六个编辑器加 CLI 加 MCP，几乎把一个人日常要碰的办公文件类型都收进来了；代价是 0.x 的成熟度、Electron 的体积，以及在复杂文档上尚未被验证的边角。官方的写法比较克制，FAQ 里连「默认发送使用统计」和「隐藏选区对 CLI 无效」这种不讨好的细节都写了出来，这比宣传语更能说明项目态度。

如果你在 Mac 或 Linux 上长期缺一个能正经改 Office 文件的工具，又愿意为 AI 修改留一份可回滚的记录，GenOffice 值得装上一周试试。如果只是偶尔看文档，或者团队强依赖宏、VBA 与复杂外部链接，先别急着替换现有 Office——拿真实文件的副本跑一遍，再决定要不要迁移。

**一句话评价：** 一个把格式保真放在 AI 生成之前的开源办公套件，适合需要在本机编辑真实 Office 文件、又希望 AI 改动可审可退的人。

---

*资料来源：*

- [GenOffice 官方 GitHub 仓库](https://github.com/genspark-ai/genoffice)
- [GenOffice 官网](https://genoffice.ai/)
- [GenOffice Releases](https://github.com/genspark-ai/genoffice/releases)
- [GenOffice 许可证（Apache-2.0）](https://github.com/genspark-ai/genoffice/blob/main/LICENSE)
- [GenOffice CLI 参考文档](https://github.com/genspark-ai/genoffice/blob/main/packages/cli/README.md)
- [GenOffice 隐私说明](https://github.com/genspark-ai/genoffice/blob/main/PRIVACY.md)
