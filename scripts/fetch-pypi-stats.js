/**
 * Fetch real-time PyPI download statistics for all packages.
 *
 * Uses two sources:
 * - pepy.tech: All-time total downloads (scraped from HTML, no API key needed)
 * - pypistats.org: 180-day time series for sparkline charts (free API)
 *
 * Writes result to client/public/data/pypi-stats.json.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PYPISTATS_BASE = 'https://pypistats.org/api/packages';
const PEPY_BASE = 'https://pepy.tech/projects';
const DELAY_MS = 2500; // Stay well under pypistats.org rate limits

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

/**
 * Scrape all-time total downloads from pepy.tech HTML.
 * The page embeds totalDownloads as a JSON value in the server-rendered HTML.
 */
async function fetchPepyTotal(packageName) {
  const res = await fetch(`${PEPY_BASE}/${packageName}`);
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/totalDownloads\\?":\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Aggregate daily downloads into weekly buckets for a cleaner sparkline.
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

async function main() {
  const yamlPath = path.join(ROOT, 'resume.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.warn('[pypi-stats] resume.yaml not found, skipping');
    return;
  }

  const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  const projects = doc?.cv?.sections?.personal_projects ?? [];
  const packages = projects
    .filter(p => p.pypi_package)
    .map(p => ({ name: p.name, pypi: p.pypi_package }));

  if (!packages.length) {
    console.log('[pypi-stats] No packages with pypi_package field found');
    return;
  }

  console.log(`[pypi-stats] Fetching stats for ${packages.length} packages...\n`);

  const stats = {};
  let grandTotal = 0;

  for (const pkg of packages) {
    try {
      // 1. All-time total from pepy.tech (no rate limit issues)
      console.log(`  → ${pkg.pypi} (pepy.tech total)`);
      const allTimeTotal = await fetchPepyTotal(pkg.pypi);
      await sleep(1000);

      // 2. Recent stats from pypistats.org
      console.log(`  → ${pkg.pypi} (recent)`);
      const recent = await fetchJSON(`${PYPISTATS_BASE}/${pkg.pypi}/recent`);
      await sleep(DELAY_MS);

      // 3. Time series from pypistats.org (180 days, without mirrors)
      console.log(`  → ${pkg.pypi} (time series)`);
      const overall = await fetchJSON(`${PYPISTATS_BASE}/${pkg.pypi}/overall?mirrors=false`);
      await sleep(DELAY_MS);

      const dailyData = overall.data.map(d => ({
        date: d.date,
        downloads: d.downloads,
      }));

      const total180d = dailyData.reduce((sum, d) => sum + d.downloads, 0);
      const weekly = aggregateWeekly(dailyData);

      stats[pkg.pypi] = {
        name: pkg.name,
        total_all_time: allTimeTotal ?? total180d,
        total_180d: total180d,
        last_day: recent.data.last_day,
        last_week: recent.data.last_week,
        last_month: recent.data.last_month,
        daily: dailyData,
        weekly,
      };

      grandTotal += allTimeTotal ?? total180d;
      console.log(`    ✓ ${pkg.pypi}: ${(allTimeTotal ?? total180d).toLocaleString()} all-time, ${total180d.toLocaleString()} (180d)\n`);
    } catch (err) {
      // If pypistats fails, try pepy.tech alone
      try {
        console.log(`    ⚠ pypistats failed, trying pepy.tech only...`);
        const allTimeTotal = await fetchPepyTotal(pkg.pypi);
        if (allTimeTotal) {
          stats[pkg.pypi] = {
            name: pkg.name,
            total_all_time: allTimeTotal,
            total_180d: 0,
            last_day: 0,
            last_week: 0,
            last_month: 0,
            daily: [],
            weekly: [],
          };
          grandTotal += allTimeTotal;
          console.log(`    ✓ ${pkg.pypi}: ${allTimeTotal.toLocaleString()} all-time (no time series)\n`);
        } else {
          console.error(`    ✗ ${pkg.pypi}: ${err.message}\n`);
        }
      } catch {
        console.error(`    ✗ ${pkg.pypi}: ${err.message}\n`);
      }
    }
  }

  const output = {
    fetched_at: new Date().toISOString(),
    total_downloads: grandTotal,
    packages: stats,
  };

  const outPath = path.join(ROOT, 'client', 'public', 'data', 'pypi-stats.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[pypi-stats] Wrote ${outPath}`);
  console.log(`[pypi-stats] Grand total: ${grandTotal.toLocaleString()} all-time downloads across ${Object.keys(stats).length} packages`);
}

main().catch(err => {
  console.error('[pypi-stats] Fatal error:', err);
  process.exit(0);
});
