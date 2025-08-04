// check-meta.js
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';

const SITEMAP_URL = 'https://www.whitepage.studio/sitemap.xml';

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  const parsed = await parseStringPromise(xml);
  return parsed.urlset.url.map(entry => entry.loc[0]);
}

async function checkMetaTags(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content');
    const h1 = $('h1').first().text();
    return {
      url,
      missing: {
        title: !title,
        description: !description,
        h1: !h1
      }
    };
  } catch (e) {
    return { url, error: e.message };
  }
}

async function run() {
  const urls = await fetchSitemapUrls();
  const results = await Promise.all(urls.map(checkMetaTags));
  const missing = results.filter(r => r.missing && (r.missing.title || r.missing.description || r.missing.h1));
  const lines = [
    `🧠 Website Meta Check Report - ${new Date().toISOString()}`,
    `Checked ${urls.length} pages.`,
    `Missing tags on ${missing.length} pages.`,
    '',
    ...missing.map(r =>
      `❌ ${r.url}\n  - title: ${!r.missing.title ? '✔' : '⛔'}\n  - description: ${!r.missing.description ? '✔' : '⛔'}\n  - h1: ${!r.missing.h1 ? '✔' : '⛔'}\n`
    )
  ];
  const report = lines.join('\n');
  await fs.writeFile('report.txt', report);
  console.log(report);
}

run();
