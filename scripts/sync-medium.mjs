#!/usr/bin/env node
/**
 * Sync new Medium posts from RSS into src/content/writing/*.mdx
 *
 * Env:
 *   MEDIUM_RSS_URL  — default https://medium.com/feed/@s-acharya
 *   SITE_URL        — default https://www.sacharya.net
 *   DRY_RUN         — set to 1 to skip writes and git push
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';
import TurndownService from 'turndown';
import { parseHTML } from 'linkedom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WRITING_DIR = join(ROOT, 'src/content/writing');

const MEDIUM_RSS_URL = process.env.MEDIUM_RSS_URL ?? 'https://medium.com/feed/@s-acharya';
const SITE_URL = (process.env.SITE_URL ?? 'https://www.sacharya.net').replace(/\/$/, '');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
});

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

turndown.remove(['script', 'style', 'iframe', 'noscript', 'svg']);

turndown.addRule('stripMediumFigures', {
  filter: ['figure'],
  replacement: (_content, node) => {
    const el = /** @type {HTMLElement} */ (node);
    const img = el.querySelector('img');
    const alt = img?.getAttribute('alt')?.trim();
  const src = img?.getAttribute('src');
    if (src && alt) {
      return `\n\n![${alt}](${src})\n\n`;
    }
    return '';
  },
});

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return url.trim();
  }
}

function normalizeTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mediumPostId(url) {
  try {
    const { pathname } = new URL(url);
    const match = pathname.match(/(?:^|[-/])([a-f0-9]{8,})\/?$/i);
    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function slugFromMediumLink(link) {
  const pathParts = new URL(link).pathname.split('/').filter(Boolean);
  const last = pathParts[pathParts.length - 1] ?? 'medium-post';
  return last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function yamlScalar(value) {
  if (typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function yamlList(items) {
  if (!items.length) {
    return '  - Essays';
  }
  return items.map((item) => `  - ${yamlScalar(item)}`).join('\n');
}

function stripHtml(html) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function htmlToMarkdown(html) {
  if (!html?.trim()) {
    return '';
  }
  const cleaned = html
    .replace(/<hr[^>]*class="[^"]*section-divider[^"]*"[^>]*>/gi, '')
    .replace(/<div[^>]*class="[^"]*section-divider[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<p class="graf graf--p">\s*<\/p>/gi, '');

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${cleaned}</body></html>`);
  let markdown = turndown.turndown(document.body);
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
  return markdown;
}

function estimateReadTime(markdown) {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

function toDateOnly(pubDate) {
  const date = pubDate ? new Date(pubDate) : new Date();
  return date.toISOString().slice(0, 10);
}

function buildSummary(item, markdown) {
  const fromSnippet = item.contentSnippet?.trim() || item.content?.trim();
  if (fromSnippet) {
    const text = stripHtml(fromSnippet);
    if (text) {
      return text.length > 240 ? `${text.slice(0, 237)}…` : text;
    }
  }
  const firstParagraph = markdown
    .split('\n\n')
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('!['));
  if (firstParagraph) {
    const collapsed = firstParagraph.replace(/\s+/g, ' ');
    return collapsed.length > 240 ? `${collapsed.slice(0, 237)}…` : collapsed;
  }
  return 'Synced from Medium.';
}

function normalizeTags(categories) {
  const raw = Array.isArray(categories) ? categories : categories ? [categories] : [];
  const tags = raw
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, ' '))
    .slice(0, 8);
  return tags.length ? [...new Set(tags)] : ['Essays'];
}

function readExistingCatalog() {
  mkdirSync(WRITING_DIR, { recursive: true });
  const slugs = new Set();
  const externalUrls = new Set();
  const mediumIds = new Set();
  const titles = new Set();

  for (const file of readdirSync(WRITING_DIR)) {
    if (!/\.(md|mdx)$/i.test(file)) {
      continue;
    }
    slugs.add(basename(file).replace(/\.(md|mdx)$/i, ''));
    const text = readFileSync(join(WRITING_DIR, file), 'utf8');
    const titleMatch = text.match(/^title:\s*(.+)$/m);
    if (titleMatch) {
      const raw = titleMatch[1].trim().replace(/^["']|["']$/g, '');
      try {
        titles.add(normalizeTitle(JSON.parse(raw)));
      } catch {
        titles.add(normalizeTitle(raw));
      }
    }

    const urlPattern = /(?:sourceUrl|externalUrl):\s*(.+)$/gm;
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      const rawUrl = match[1].trim().replace(/^["']|["']$/g, '');
      const normalized = normalizeUrl(rawUrl);
      if (!normalized.includes('medium.com')) {
        continue;
      }
      externalUrls.add(normalized);
      const id = mediumPostId(normalized);
      if (id) {
        mediumIds.add(id);
      }
    }
  }

  return { slugs, externalUrls, mediumIds, titles };
}

function isAlreadyImported({ item, externalUrl, slug, catalog }) {
  if (catalog.externalUrls.has(externalUrl)) {
    return 'already linked';
  }

  const mediumId = mediumPostId(externalUrl);
  if (mediumId && catalog.mediumIds.has(mediumId)) {
    return 'medium id linked';
  }

  for (const existingSlug of catalog.slugs) {
    if (slug === existingSlug || slug.startsWith(`${existingSlug}-`) || existingSlug.startsWith(`${slug}-`)) {
      return `slug matches ${existingSlug}`;
    }
  }

  const titleKey = normalizeTitle(item.title);
  if (catalog.titles.has(titleKey)) {
    return 'title already exists';
  }

  return null;
}

function writeMdx({ slug, title, date, summary, readTime, tags, externalUrl, canonicalUrl, body }) {
  const frontmatter = `---
title: ${yamlScalar(title)}
date: ${date}
summary: ${yamlScalar(summary)}
readTime: ${yamlScalar(readTime)}
tags:
${yamlList(tags)}
externalUrl: ${yamlScalar(externalUrl)}
canonicalUrl: ${yamlScalar(canonicalUrl)}
---

`;

  const filePath = join(WRITING_DIR, `${slug}.mdx`);
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${filePath}`);
    return filePath;
  }
  writeFileSync(filePath, frontmatter + body + '\n', 'utf8');
  console.log(`Wrote ${filePath}`);
  return filePath;
}

function runGitCommit(createdSlugs) {
  if (DRY_RUN || createdSlugs.length === 0) {
    return;
  }

  const inCi = process.env.GITHUB_ACTIONS === 'true';
  if (!inCi) {
    console.log('New files created locally; skipping git push (not running in GitHub Actions).');
    return;
  }

  execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { stdio: 'inherit' });
  execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], {
    stdio: 'inherit',
  });
  execFileSync('git', ['add', '--', 'src/content/writing'], { cwd: ROOT, stdio: 'inherit' });
  const subject =
    createdSlugs.length === 1
      ? `sync: import Medium essay "${createdSlugs[0]}"`
      : `sync: import ${createdSlugs.length} Medium essays`;
  execFileSync('git', ['commit', '-m', subject], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('git', ['push'], { cwd: ROOT, stdio: 'inherit' });
}

async function main() {
  console.log(`Fetching ${MEDIUM_RSS_URL}`);
  const feed = await parser.parseURL(MEDIUM_RSS_URL);
  const catalog = readExistingCatalog();
  const createdSlugs = [];

  for (const item of feed.items ?? []) {
    const link = item.link || item.guid;
    if (!link || !item.title) {
      continue;
    }

    const externalUrl = normalizeUrl(link);
    const slug = slugFromMediumLink(externalUrl);
    const duplicateReason = isAlreadyImported({ item, externalUrl, slug, catalog });
    if (duplicateReason) {
      console.log(`Skip (${duplicateReason}): ${item.title}`);
      continue;
    }

    if (!slug) {
      console.log(`Skip (no slug): ${item.title}`);
      continue;
    }

    const html = item.contentEncoded || item['content:encoded'] || item.content || '';
    const body = htmlToMarkdown(html);
    if (!body.trim()) {
      console.warn(`Skip (empty body): ${item.title}`);
      continue;
    }

    const summary = buildSummary(item, body);
    const readTime = estimateReadTime(body);
    const tags = normalizeTags(item.categories);
    const date = toDateOnly(item.pubDate || item.isoDate);
    const canonicalUrl = `${SITE_URL}/writing/${slug}`;

    writeMdx({
      slug,
      title: item.title.trim(),
      date,
      summary,
      readTime,
      tags,
      externalUrl,
      canonicalUrl,
      body,
    });

    catalog.slugs.add(slug);
    catalog.externalUrls.add(externalUrl);
    const mediumId = mediumPostId(externalUrl);
    if (mediumId) {
      catalog.mediumIds.add(mediumId);
    }
    catalog.titles.add(normalizeTitle(item.title));
    createdSlugs.push(slug);
  }

  if (createdSlugs.length === 0) {
    console.log('No new Medium essays to import.');
    return;
  }

  console.log(`Imported ${createdSlugs.length} new essay(s).`);
  runGitCommit(createdSlugs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});