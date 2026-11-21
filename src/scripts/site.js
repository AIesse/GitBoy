// 站点交互：明暗模式、中英文切换、下拉刷新。
// 全部在客户端完成，不需要重新构建或后端。

const DICT = {
  zh: {
    'nav.posts': '文章',
    'nav.about': '关于',
    'nav.telegram': '电报群 ↗',
    'footer.tagline': '记录技术，也记录生活。',
    'footer.telegram': '电报群 ↗',

    'index.h1': '记录值得记录的。<br /><span>分享有用的东西。</span>',
    'index.intro': '你好，我是 GitBoy。这里分享开源工具、技术实践与日常思考。',
    'index.status': '持续更新中',
    'index.metaFlow': '写作 · 分享 · 开源',
    'index.archive': '文章归档',
    'index.latest': '最近文章',
    'index.search': '搜索文章…',
    'index.filter': '按标签筛选',
    'index.all': '全部',
    'index.empty': '没有找到相关文章。',
    'index.end': '— 已经到底了 —',

    'post.back': '← 返回文章列表',
    'post.thanks': '感谢阅读。',
    'post.more': '阅读更多文章 ↗',

    'about.h1': '你好，<br /><span>我是 GitBoy。</span>',
    'about.p1': '欢迎来到「开源通宝」。这是一个用于记录、整理和分享的个人博客。',
    'about.p2': '这里主要关注开源软件、Mac 与效率工具、开发实践，以及生活中的观察和思考。',
    'about.h2author': '关于作者',
    'about.pauthor': '我是 GitBoy。喜欢探索好用的软件与工具，也乐于把实践过程中的经验整理成文章。',
    'about.h2site': '关于本站',
    'about.psite': '本站采用 Markdown 写作，基于 Astro 构建，并通过 GitHub Pages 自动发布。内容以长期积累为主，尽量保持简洁、准确和实用。',
    'about.h2contact': '联系我',
    'about.pcontact':
      '电报群：<a href="https://t.me/gitboy" target="_blank" rel="noreferrer">t.me/gitboy</a>　·　仓库：<a href="https://github.com/AIesse/GitBoy" target="_blank" rel="noreferrer">AIesse/GitBoy</a>',
  },
  en: {
    'nav.posts': 'Posts',
    'nav.about': 'About',
    'nav.telegram': 'Telegram ↗',
    'footer.tagline': 'Tech, tools and a bit of life.',
    'footer.telegram': 'Telegram ↗',

    'index.h1': 'Record what matters.<br /><span>Share what helps.</span>',
    'index.intro': "Hi, I'm GitBoy. Open-source tools, hands-on notes and everyday thoughts.",
    'index.status': 'Updated regularly',
    'index.metaFlow': 'Writing · Sharing · Open source',
    'index.archive': 'Archive',
    'index.latest': 'Latest posts',
    'index.search': 'Search posts…',
    'index.filter': 'Filter by tag',
    'index.all': 'All',
    'index.empty': 'No matching posts.',
    'index.end': '— End of list —',

    'post.back': '← All posts',
    'post.thanks': 'Thanks for reading.',
    'post.more': 'More posts ↗',

    'about.h1': "Hi,<br /><span>I'm GitBoy.</span>",
    'about.p1': 'Welcome to my blog — a place for notes, writing and sharing.',
    'about.p2':
      'Mostly open-source software, Mac and productivity tools, development practice, plus observations from daily life.',
    'about.h2author': 'About the author',
    'about.pauthor':
      "I'm GitBoy. I like exploring useful software, and turning hands-on experience into write-ups.",
    'about.h2site': 'About this site',
    'about.psite':
      'Written in Markdown, built with Astro, published automatically on GitHub Pages. Built for the long run — concise, accurate, practical.',
    'about.h2contact': 'Contact',
    'about.pcontact':
      'Telegram: <a href="https://t.me/gitboy" target="_blank" rel="noreferrer">t.me/gitboy</a>　·　Repo: <a href="https://github.com/AIesse/GitBoy" target="_blank" rel="noreferrer">AIesse/GitBoy</a>',
  },
};

// 标签是文章自己的分类名，给常见标签配一份英文对照；没配的原样显示
const TAG_EN = {
  开始: 'Start here',
  开源软件: 'Open source',
  效率工具: 'Productivity',
  随笔: 'Notes',
  教程: 'Tutorial',
  工具: 'Tools',
  安全: 'Security',
  前端: 'Frontend',
  后端: 'Backend',
  自部署: 'Self-hosted',
  自托管: 'Self-hosted',
  媒体管理: 'Media library',
  影音: 'Media',
  NAS: 'NAS',
};

const root = document.documentElement;
const meta = document.querySelector('meta[name="theme-color"]');
const THEME_COLOR = { light: '#f7f7f5', dark: '#121312' };

const read = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* 隐私模式下写不进去，忽略 */
  }
};

let lang = read('lang', 'zh') === 'en' ? 'en' : 'zh';
const isEn = () => lang === 'en';

// ---------------------------------------------------------------- 主题
function applyTheme(theme) {
  root.dataset.theme = theme;
  if (meta) meta.setAttribute('content', THEME_COLOR[theme] || THEME_COLOR.light);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute(
      'aria-label',
      theme === 'dark' ? (isEn() ? 'Switch to light mode' : '切换到亮色模式') : isEn() ? 'Switch to dark mode' : '切换到暗色模式',
    );
  }
}

// ---------------------------------------------------------------- 语言
function applyLang(next, persist = true) {
  lang = next === 'en' ? 'en' : 'zh';
  if (persist) write('lang', lang);
  const dict = DICT[lang];
  root.lang = lang === 'en' ? 'en' : 'zh-CN';

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = dict[el.dataset.i18n];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const v = dict[el.dataset.i18nHtml];
    if (v != null) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split('|').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key && dict[key] != null) el.setAttribute(attr, dict[key]);
    });
  });

  // 标签：中文 / 英文对照
  document.querySelectorAll('[data-tag-label]').forEach((el) => {
    const raw = el.dataset.tagLabel;
    if (!raw) return;
    el.textContent = lang === 'en' ? TAG_EN[raw] || raw : raw;
  });

  // 日期：中文用「2026年11月21日」，英文用「Nov 21, 2026」
  document.querySelectorAll('[data-date]').forEach((el) => {
    const d = new Date(el.dataset.date);
    if (Number.isNaN(d.getTime())) return;
    el.textContent =
      lang === 'en'
        ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.textContent = lang === 'en' ? '中' : 'EN';
    langBtn.setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
  }

  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
}

// ---------------------------------------------------------------- 事件绑定
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  write('theme', next);
  applyTheme(next);
});

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  applyLang(isEn() ? 'zh' : 'en');
});

applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
applyLang(lang, false);

// ---------------------------------------------------------------- 下拉刷新（仅触屏）
const indicator = document.getElementById('pull-indicator');
const coarse = window.matchMedia('(pointer: coarse)').matches;
const THRESHOLD = 64;

if (indicator && coarse) {
  let startY = 0;
  let active = false;
  let dist = 0;

  const reset = () => {
    indicator.classList.remove('pulling', 'ready');
    indicator.style.setProperty('--pull-y', '0px');
    dist = 0;
    active = false;
  };

  window.addEventListener(
    'touchstart',
    (e) => {
      if (window.scrollY > 0 || e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      active = true;
      dist = 0;
    },
    { passive: true },
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        reset();
        return;
      }
      // 阻尼：拉得越多越沉，最多 96px
      dist = Math.min(dy * 0.55, 96);
      indicator.style.setProperty('--pull-y', `${dist}px`);
      indicator.classList.add('pulling');
      indicator.classList.toggle('ready', dist >= THRESHOLD);
    },
    { passive: true },
  );

  window.addEventListener(
    'touchend',
    () => {
      if (!active) return;
      if (dist >= THRESHOLD) {
        indicator.classList.add('loading');
        indicator.style.setProperty('--pull-y', `${THRESHOLD}px`);
        location.reload();
        return;
      }
      reset();
    },
    { passive: true },
  );

  window.addEventListener('touchcancel', reset, { passive: true });
}
