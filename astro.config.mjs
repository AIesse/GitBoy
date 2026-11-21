import { defineConfig } from 'astro/config';

const repository = process.env.GITHUB_REPOSITORY;
const [owner, repo] = repository?.split('/') ?? [];
const isUserSite = repo && owner && repo === `${owner}.github.io`;

export default defineConfig({
  site: owner ? `https://${owner}.github.io` : 'https://example.com',
  base: repo && !isUserSite ? `/${repo}/` : '/',
});
