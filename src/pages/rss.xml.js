import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// BASE_URL 有时带尾斜杠有时不带，统一成 '/GitBoy/'，否则会拼出 /GitBoyposts/…
const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

/** 正文里的站内绝对路径（/GitBoy/images/…）在阅读器里没有域名，必须补成完整 URL。 */
const absolutize = (html, origin) => html.replace(/(src|href)="\/(?!\/)/g, `$1="${origin}/`);

export async function GET(context) {
  const origin = new URL(BASE, context.site).origin;
  const site = new URL(BASE, context.site);
  const feedUrl = new URL(`${BASE}rss.xml`, context.site).href;

  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const lastBuild = posts.length
    ? new Date(Math.max(...posts.map((p) => p.data.pubDate.valueOf())))
    : new Date();

  return rss({
    title: '开源通宝 · GitBoy',
    description: 'GitBoy 的个人博客，记录开源工具、技术实践与生活思考。',
    site,
    // 阅读器靠 self 链接识别、去重、判断更新；缺了它 W3C 校验器会报 MissingAtomSelfLink
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      content: 'http://purl.org/rss/1.0/modules/content/',
    },
    customData:
      `<language>zh-CN</language>` +
      `<lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>` +
      `<generator>Astro</generator>` +
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />`,
    items: posts.map((post) => {
      const slug = post.id.replace(/\.md$/, '');
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: new URL(`${BASE}posts/${slug}/`, context.site).href,
        categories: post.data.tags || [],
        // 全文输出：阅读器里直接能读，图片路径补成绝对地址
        content: absolutize(post.rendered?.html || '', origin),
      };
    }),
  });
}
