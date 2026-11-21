# 开源通宝 · GitBoy

一个现代极简黑白灰风格的中文个人博客。使用 Astro 构建，文章以 Markdown 管理，通过 GitHub Pages 免费托管和自动部署。

## 功能

- 极简、响应式中文界面
- Markdown 文章与独立阅读页面
- 文章搜索、标签筛选
- 关于页面与 RSS 订阅
- GitHub Actions 自动构建部署
- 无数据库、无付费服务、无运行时后端

## 基本信息

- 博客名称：开源通宝
- 作者昵称：GitBoy
- 推荐仓库名：`GitBoy`
- 默认分支：`main`
- Node.js：20 或更高版本

## 本地预览

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
```

## 写文章

在 `src/content/blog/` 中创建 Markdown 文件，例如 `my-first-post.md`：

```md
---
title: "文章标题"
description: "用一句话概括文章内容。"
pubDate: 2026-11-21
tags: [开源, 技术]
---

正文从这里开始。支持标准 Markdown。
```

可选字段：

- `updatedDate`：最后更新日期
- `draft: true`：草稿，不会发布到网站

保存后提交并推送到 GitHub 的 `main` 分支，网站会自动更新。

## 发布到 GitHub Pages

1. 登录 GitHub，创建一个名为 `GitBoy` 的仓库。仓库名区分大小写不影响访问。
2. 将本项目全部文件上传到仓库根目录，或使用 Git 推送到 `main` 分支。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
5. 等待 Actions 中的 **Deploy blog to GitHub Pages** 工作流成功。
6. 项目站点地址通常为 `https://你的GitHub用户名.github.io/GitBoy/`。

> 注意：`GitBoy` 是仓库名，不一定等于你的 GitHub 登录用户名。最终网址中的用户名必须使用你的真实 GitHub username。Astro 配置会根据 GitHub Actions 提供的 `GITHUB_REPOSITORY` 自动设置站点路径。

## 目录结构

```text
src/
  content/blog/       # 在这里写文章（Markdown）
  layouts/Base.astro  # 全站页头、页脚与基础布局
  pages/              # 首页、文章页、关于页、RSS
  styles/global.css   # 黑白灰视觉样式
.github/workflows/
  deploy.yml          # GitHub Pages 自动部署
```

## 修改博客资料

- 修改首页介绍：`src/pages/index.astro`
- 修改作者介绍：`src/pages/about.astro`
- 修改站点名称和页脚：`src/layouts/Base.astro`
- 修改样式：`src/styles/global.css`

## 许可证

本项目模板代码可按需修改和使用。文章、图片及其他内容的版权归各自作者所有。
