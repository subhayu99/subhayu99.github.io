/**
 * Fetch real-time npm download statistics for all packages.
 *
 * Uses the public npm registry API (no key needed):
 * - registry.npmjs.org: package metadata, used to find the first-publish date
 * - api.npmjs.org/downloads/range: daily counts, paged in <=18-month windows
 *   (the API's hard limit per request) back to first publish, which is how we
 *   get a real all-time total — npm has no all-time endpoint.
 *
 * Writes result to client/public/data/npm-stats.json, in the same shape as
 * pypi-stats.json so the sparkline components can consume either one.
 *
 * Skips the remote fetch if a recent JSON exists locally OR on the deployed
 * site (within CACHE_MAX_AGE_MS). Set FORCE_REFRESH=1 to bypass the cache.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { tryLoadCache, isForceRefresh } from './utils/cache-helper.js';
import { detectBaseUrl } from './utils/detect-repo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_BASE = 'https://registry.npmjs.org';
const DOWNLOADS_BASE = 'https://api.npmjs.org/downloads';
const DELAY_MS = 500; // npm's API is generous; stay polite anyway
const MAX_RETRIES = 3;

// Cache window: matches the PyPI pipeline. Download counts move slowly.
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

// npm rejects ranges longer than 18 months in a single request.
const MAX_RANGE_DAYS = 540;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchJSON(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const backoff = DELAY_MS * attempt * 4;
      console.log(`      ↻ ${res.status}, retrying in ${(backoff / 1000).toFixed(0)}s (attempt ${attempt}/${retries})`);
      await sleep(backoff);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
}

/**
 * First-publish date, so we know how far back to page the download range.
 * Scoped names must be %2F-encoded for the registry API (but NOT for the
 * downloads API, which wants the raw @scope/name).
 */
async function fetchFirstPublish(pkg) {
  const encoded = pkg.replace('/', '%2F');
  const meta = await fetchJSON(`${REGISTRY_BASE}/${encoded}`);
  const created = meta?.time?.created;
  return {
    created: created ? new Date(created) : null,
    latest: meta?.['dist-tags']?.latest ?? null,
    versions: Object.keys(meta?.time ?? {}).filter(k => k !== 'created' && k !== 'modified').length,
  };
}

/**
 * Walk daily download counts from `since` to today in <=18-month windows.
 * Returns a flat [{ date, downloads }] sorted ascending, zero-days included
 * (the sparkline needs an unbroken axis).
 */
async function fetchDailyRange(pkg, since) {
  const today = new Date();
  const out = [];
  let cursor = new Date(since);

  while (cursor <= today) {
    const windowEnd = new Date(cursor);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + MAX_RANGE_DAYS);
    const end = windowEnd > today ? today : windowEnd;

    const range = `${toISODate(cursor)}:${toISODate(end)}`;
    const data = await fetchJSON(`${DOWNLOADS_BASE}/range/${range}/${pkg}`);
    for (const d of data?.downloads ?? []) {
      out.push({ date: d.day, downloads: d.downloads });
    }

    cursor = new Date(end);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor <= today) await sleep(DELAY_MS);
  }

  // De-dupe on date; overlapping window edges would otherwise double-count.
  const seen = new Map();
  for (const row of out) seen.set(row.date, row.downloads);
  return [...seen.entries()]
    .map(([date, downloads]) => ({ date, downloads }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate daily downloads into weekly buckets for a cleaner sparkline.
 * Same bucketing as the PyPI pipeline so charts line up.
 */
function aggregateWeekly(dailyData) {
  if (!dailyData.length) return [];

  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

  const weeks = [];
  let currentWeek = { date: sorted[0].date, downloads: 0 };
  let dayCount = 0;

  for (const day of sorted) {
    currentWeek.downloads += day.downloads;
    dayCount++;
    if (dayCount === 7) {
      weeks.push({ ...currentWeek });
      currentWeek = { date: day.date, downloads: 0 };
      dayCount = 0;
    }
  }
  if (dayCount > 0) {
    weeks.push({ ...currentWeek });
  }

  return weeks;
}

function sumLastNDays(dailyData, n) {
  return dailyData.slice(-n).reduce((sum, d) => sum + d.downloads, 0);
}

async function main() {
  const yamlPath = path.join(ROOT, 'resume.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.warn('[npm-stats] resume.yaml not found, skipping');
    return;
  }

  const outPath = path.join(ROOT, 'client', 'public', 'data', 'npm-stats.json');

  const baseUrl = detectBaseUrl();
  const cached = await tryLoadCache({
    localPath: outPath,
    remoteUrl: baseUrl ? `${baseUrl}/data/npm-stats.json` : undefined,
    freshnessKey: 'fetched_at',
    maxAgeMs: CACHE_MAX_AGE_MS,
  });
  if (cached) {
    console.log(
      `[npm-stats] ✓ using cached data (${cached.ageHours}h old, source=${cached.source}); skipping remote fetch`,
    );
    console.log(`[npm-stats] (set FORCE_REFRESH=1 to override)`);
    return;
  }
  if (isForceRefresh()) {
    console.log('[npm-stats] FORCE_REFRESH=1 — bypassing cache');
  }

  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  const projects = doc?.cv?.sections?.personal_projects ?? [];
  const packages = projects
    .filter(p => p.npm_package)
    .map(p => ({ name: p.name, npm: p.npm_package }));

  if (!packages.length) {
    console.log('[npm-stats] No packages with npm_package field found');
    return;
  }

  console.log(`[npm-stats] Fetching stats for ${packages.length} package(s)...\n`);

  const stats = {};
  let grandTotal = 0;

  for (const pkg of packages) {
    try {
      console.log(`  → ${pkg.npm} (registry metadata)`);
      const { created, latest, versions } = await fetchFirstPublish(pkg.npm);
      if (!created) throw new Error('no created date in registry metadata');
      await sleep(DELAY_MS);

      console.log(`  → ${pkg.npm} (daily range since ${toISODate(created)})`);
      const dailyData = await fetchDailyRange(pkg.npm, created);

      const totalAllTime = dailyData.reduce((sum, d) => sum + d.downloads, 0);
      const weekly = aggregateWeekly(dailyData);

      stats[pkg.npm] = {
        name: pkg.name,
        total_all_time: totalAllTime,
        total_180d: sumLastNDays(dailyData, 180),
        last_day: sumLastNDays(dailyData, 1),
        last_week: sumLastNDays(dailyData, 7),
        last_month: sumLastNDays(dailyData, 30),
        first_published: toISODate(created),
        latest_version: latest,
        versions,
        daily: dailyData,
        weekly,
      };

      grandTotal += totalAllTime;
      console.log(
        `    ✓ ${pkg.npm}: ${totalAllTime.toLocaleString()} all-time, ` +
        `${sumLastNDays(dailyData, 30).toLocaleString()} (30d), v${latest}\n`,
      );
    } catch (err) {
      console.error(`    ✗ ${pkg.npm}: ${err.message}\n`);
    }
  }

  const output = {
    fetched_at: new Date().toISOString(),
    total_downloads: grandTotal,
    packages: stats,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[npm-stats] Wrote ${outPath}`);
  console.log(`[npm-stats] Grand total: ${grandTotal.toLocaleString()} all-time downloads across ${Object.keys(stats).length} package(s)`);
}

main().catch(err => {
  console.error('[npm-stats] Fatal error:', err);
  process.exit(0);
});
