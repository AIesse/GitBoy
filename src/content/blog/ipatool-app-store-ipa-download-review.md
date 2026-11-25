---
title: "ipatool：在终端里检索 App Store、下载历史版本 ipa 的工具"
description: "ipatool 是一款用 Apple ID 在终端搜索 App Store、查看版本历史并下载 ipa 或 pkg 的命令行工具，本文整理它的功能、场景、优缺点与安装方式。"
pubDate: 2026-11-25T08:22:33+08:00
tags: [工具, 开源软件, 效率工具]
---

![ipatool 官方首页展示的终端下载过程：一条命令拿到 ipa](/GitBoy/images/ipatool-app-store-ipa-download-review/01-official-download.jpg)

需要一份旧版本的 ipa，是件很别扭的事。App Store 只给你最新版，手机上的「已购」列表也只剩一个下载按钮，点了就自动升级到当前版本。做回归测试的要旧版复现问题，做安全审计的要拆包看二进制差异，给测试机做离线安装的要一个能直接拖进去的安装包——这些场景在图形界面里几乎没有入口。

**ipatool** 是一款用 Go 编写的命令行工具，用你自己的 Apple ID 登录 App Store，在终端里搜索 iOS、iPadOS、tvOS、watchOS、visionOS 和 macOS 应用，列出某个应用的历史版本，并把对应的 `.ipa` 或 macOS `.pkg` 安装包下载到本地。

> 本文依据 ipatool 官方 GitHub 仓库、官网 ipatool.dev 与 Releases 发布说明整理，属于资料型评价：功能、参数与版本信息以官方文档为准，未对登录与下载流程做完整的实机验证。Apple 侧接口与风控策略随时可能变化，实际操作请以你运行时的输出为准。

## 一、核心功能

### 1. 账号登录与凭据保管

所有操作都建立在「登录一个真实 Apple ID」这个前提上。`ipatool auth login` 交互式提示输入账号与密码，账号可以是邮箱，也可以是手机号；触发两步验证时再输入 6 位验证码。非交互环境（CI、脚本）用 `--non-interactive` 关闭提示，同时显式传入 `--email`、`--password`，需要验证码时用 `--auth-code`。

密码不落在明文的配置文件里，而是交给系统钥匙串：macOS 钥匙串、Linux 的 Secret Service，没有桌面环境时回退到本地加密文件，服务名固定为 `ipatool-auth.service`。App Store 的会话 Cookie 存在状态目录 `~/.ipatool/cookies`，设置了 `XDG_STATE_HOME` 或 `XDG_DATA_HOME` 的话则放进对应目录。

![macOS 上开启两步验证并获取验证码的入口，ipatool 仓库附带的说明截图](/GitBoy/images/ipatool-app-store-ipa-download-review/02-two-factor-auth.jpg)

有两点容易踩坑。一是首次登录很慢，工具自己会打印「preparing authentication; the first login may take a few minutes」，因为 v2.8.0 起改成了在本地生成并配置 Anisette 数据。二是非交互模式下必须给 `--keychain-passphrase`，否则会因为无法解锁钥匙串直接报错退出——这条错误信息在源码里写得很明确。用完想清干净，`ipatool auth revoke` 撤销凭据，`ipatool auth info` 查看当前登录的是哪个账号。

### 2. 检索与版本考古

`ipatool search <关键词>` 在 App Store 里搜应用，`--limit` 控制返回条数（默认 5 条，visionOS 最多 12 条），`--platform` 指定平台。加上全局参数 `--format json` 后，输出变成结构化数据，可以直接喂给脚本或 AI agent。

真正有价值的是版本相关的那几条命令。`ipatool list-versions` 列出一个应用当前可下载的所有版本，`ipatool get-version-metadata` 取某个具体版本的元数据——后者必须传 `--external-version-id`，也就是从版本列表里拿到的那个版本标识。这条链路意味着你能先看清「这个应用还留着哪几个旧版本」，再决定拉哪一个，而不是赌最新版能不能复现问题。

还有一个容易被忽略的命令：`ipatool list-purchases`。它把当前账号名下的已购应用列成清单，等于一份现成的 bundle ID 索引。找不准某个应用的 bundle ID 时，从这里翻比在商店页面上猜要快；也已经下架、但购买记录还在的应用，同样能从这份清单里找到线索——v2.8.0 的发布说明专门提到修复了这类已下架应用的重新下载。

### 3. 许可：先拥有，再下载

ipatool 不做任何绕过购买的事。`ipatool purchase` 的作用是替你完成「获取许可」这一步——相当于在 App Store 里点一次「获取」按钮，让这个 Apple ID 名下多一条该应用的授权记录。`ipatool download` 带 `--purchase` 参数时，遇到没有许可的应用会自动补上这一步。

这也是这类工具最容易被误解的地方：它能下载的，只是你这个账号本来就能免费获取、或者已经购买过的应用。付费应用不会因为你用了命令行就免费，别人账号里的应用也拿不到。

### 4. 下载：按 bundle id、版本、平台

`ipatool download` 支持两种定位方式：`--app-id`（数字 ID）或 `--bundle-identifier`（如 `dev.majd.trophybuddy`），两者同时给出时 bundle ID 优先。`--output` 指定落盘路径，`--platform` 在 iphone、ipad、appletv、watchos、visionos、macos 之间切换，`--external-version-id` 指定要哪个历史版本，不给就取最新版。

`--platform` 不是装饰性参数。同一个 bundle ID 在不同平台往往对应不同的产物，要哪个平台的包就得显式指定哪个；bundle ID 查不到时还可以退回用数字 app ID 定位，官方说明里对已下架应用的补救也是这条路。

![ipatool 的下载链路：登录、检索、取得许可、下载、落盘](/GitBoy/images/ipatool-app-store-ipa-download-review/03-workflow.jpg)

v2.8.1 给大包加了并行下载流，同时把 App Store 的店面（storefront）改成动态发现，内置列表里没有的地区也能用；v2.8.0 则修好了「已下架但曾经购买过」的应用重新下载的问题，以及没有声明平台信息的古董应用。对需要长期留档老版本的人来说，后一条比任何新功能都实在——应用一旦从商店下架，能把它从账号历史里捞出来的工具就只剩这么几个。

### 5. MCP：把 App Store 交给 AI agent

v2.7.0 起，`ipatool mcp` 会以 stdio 方式启动一个 MCP 服务器，把 search、download、list-purchases、list-versions、get-version-metadata、purchase 六个能力暴露给 AI agent。官方给出的配置就是在 MCP 客户端里加一段：

```json
{
  "mcpServers": {
    "ipatool": {
      "command": "ipatool",
      "args": ["mcp"]
    }
  }
}
```

前提是先在终端里跑过一次 `ipatool auth login`。这个设计挺务实：MCP 服务器本身不处理登录，复用已有的钥匙串凭据，避免把密码散落到各个客户端配置里。需要注意的是，把 purchase 和 download 也暴露出去，等于让 agent 有能力用你的账号花钱和拉包，接之前想清楚要不要给它这么大权限。

## 二、适合哪些使用场景？

- **回归测试与问题复现：** 用户报的 bug 只在某个旧版本出现，需要拉回对应版本在测试机上复现。
- **多版本兼容性验证：** 用 `list-versions` 加 `--external-version-id`，成批拿到几个历史版本做对比安装。
- **应用留档：** 自己买过、常用的应用，把安装包存一份到本地或 NAS，避免下架后无处可取。
- **测试机与旧设备离线安装：** 拿到 `.ipa` 后通过 Apple Configurator、Xcode 或第三方工具侧载，不依赖设备上的 App Store。
- **拆包与安全审计：** 安全研究、竞品分析、体积与依赖分析，都需要原始的 ipa 文件。
- **自动化与 AI 工作流：** 用 `--format json` 或 MCP 把「查版本、取元数据、下包」接进流水线。

如果只是想给自己的 iPhone 装个应用，直接开 App Store 就行，没必要为此多装一个命令行工具。

## 三、优点与注意事项

**优点**

1. 免费开源，MIT 许可证，Go 单二进制，没有运行时依赖。
2. 平台覆盖很全：macOS、Linux、Windows 都有预编译包，Apple Silicon 与 Intel 分别出包，macOS 上还能用 Homebrew 装。
3. 能力边界清楚：搜索、版本列表、版本元数据、购买、下载、账号管理各自一条命令，输出支持 JSON，适合脚本化。
4. 更新活跃。最新版本 v2.8.1 发布于 2026-11-11，仓库约 12,400 星，最近一次提交在 2026-11-17。
5. 凭据处理相对克制：密码进系统钥匙串，会话 Cookie 单独存状态目录，支持 `revoke` 撤销。
6. 已经跟进 MCP，能被 AI agent 直接调用，这在同类 CLI 里还不多见。

**需要留意**

1. 必须使用自己的 Apple ID，且该账号需要在 App Store 上可用；登录会触发两步验证，首次登录要等几分钟。
2. 只能下载本账号已购或可免费获取的应用，不具备任何绕过购买的能力。
3. 依赖 Apple 的私有接口，属于灰域用法。Apple 随时可能改协议或加风控，v2.7.0 到 v2.8.1 这一个月里就有过一次「恢复认证」的修复，说明接口稳定性不由工具方掌握。
4. 账号安全要自己把关：不要把密码写进脚本参数后上传到公开仓库，`--password` 会留在 shell 历史里；CI 场景更应该用 `--keychain-passphrase` 配合受限账号。
5. 下载下来的 ipa 版权属于开发者，自行留档和分发是两回事，别把包传到公开渠道。
6. 只提供命令行界面，没有图形界面，参数需要现查 `--help`。

![登录凭据的去向：钥匙串存密码，状态目录存会话](/GitBoy/images/ipatool-app-store-ipa-download-review/04-credentials.jpg)

## 四、安装方式

### Homebrew（macOS 推荐）

```shell
brew install ipatool
```

### 预编译包

到 [Releases 页面](https://github.com/majd/ipatool/releases) 下载对应平台的压缩包。v2.8.1 提供 ios-arm64、linux-amd64、linux-arm64、macos-amd64、macos-arm64、windows-amd64、windows-arm64 七个包，每个都配 `.sha256sum` 文件，建议先校验再解压。解压出来是单个可执行文件，macOS 与 Linux 放进入 PATH 的目录再 `chmod +x`；Windows 上更省事的做法是把解压目录加进系统 PATH，或者直接在该目录下用 `.\ipatool.exe` 调用。

### 从源码编译

需要 Go 工具链：

```shell
git clone https://github.com/majd/ipatool.git
cd ipatool
go build -o ipatool
```

### 首次使用

先登录，再检索并下载：

```shell
ipatool auth login
ipatool search "Xcode" --limit 3
ipatool list-versions --bundle-identifier dev.majd.trophybuddy
ipatool download --bundle-identifier dev.majd.trophybuddy --output ./TrophyBuddy.ipa
```

下载历史版本时，先从 `list-versions` 拿到 external version id，再传给 `download`：

```shell
ipatool download -b dev.majd.trophybuddy --external-version-id <版本标识> -o ./old.ipa
```

在脚本里跑，记得关掉交互并把钥匙串口令显式传进去：

```shell
ipatool download -b dev.majd.trophybuddy \
  --non-interactive --keychain-passphrase "$KEYCHAIN_PASS" \
  -o ./out.ipa --format json
```

官方项目地址：[github.com/majd/ipatool](https://github.com/majd/ipatool)

## 五、综合评价

ipatool 解决的是一个商店界面故意不提供的能力：拿到某个应用的具体安装包和具体旧版本。它的做法不花哨——把自己的账号登进去，按平台和版本把包拉下来，凭据交给系统钥匙串保管。功能边界也很清楚，只处理你有权获取的应用，不做越权的事。

真正决定它好不好用的是两个变量，都不在工具自己手里：Apple 的接口是否继续可用，以及你的账号能不能顺利过两步验证。前者从发布记录就能看出波动，一个月内既有「恢复认证」的大修，也有并行下载这种稳步优化；后者取决于你自己的账号状态。所以它更像一把需要定期维护的专用工具，而不是装完就忘的常驻软件。

如果你确实有拉旧版本、留档、拆包的需求，它是目前这条路上最成熟的选项之一：MIT 许可、单二进制、平台齐全，还顺手把 MCP 接上了。如果只是偶尔装个应用，用不上它。

**一句话评价：** 定位精准的 App Store 命令行客户端，用自己账号换取「指定版本安装包」这一商店不提供的能力，代价是要接受接口随时变动的现实。

---

*资料来源：*

- [ipatool 官方 GitHub 仓库](https://github.com/majd/ipatool)
- [ipatool 官网](https://ipatool.dev)
- [ipatool Releases（v2.8.1）](https://github.com/majd/ipatool/releases)
- [MIT 许可证原文](https://github.com/majd/ipatool/blob/main/LICENSE)
- [v2.8.1 发布说明](https://github.com/majd/ipatool/releases/tag/v2.8.1)
