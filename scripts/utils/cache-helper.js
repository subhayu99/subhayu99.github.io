/**
 * Cache helper for build-time API fetchers.
 *
 * Lets fetcher scripts skip remote API calls when previously-generated
 * data is still fresh enough. The deployed site itself acts as the
 * "remote cache" — every JSON we write under client/public/data/ is
 * publicly served at <site>/data/<file>.
 *
 * Lookup order:
 *   1. Local file (most recent prior run on this runner, if any)
 *   2. Remote file (the live deployed site)
 *   3. Cache miss → caller does the actual API fetch
 *
 * Usage:
 *
 *   import { tryLoadCache } from './utils/cache-helper.js';
 *
 *   const cached = await tryLoadCache({
 *     localPath: OUT_FILE,
 *     remoteUrl: 'https://subhayu.in/data/pypi-stats.json',
 *     freshnessKey: 'fetched_at',
 *     maxAgeMs: 12 * 60 * 60 * 1000,
 *   });
 *   if (cached) {
 *     console.log(`✓ using cached data (${cached.ageHours}h old)`);
 *     return;
 *   }
 *   // …fall through to the API fetch
 *
 * Honors process.env.FORCE_REFRESH === '1' to bypass entirely.
 */

import fs from 'fs';
import path from 'path';

const FORCE_REFRESH = process.env.FORCE_REFRESH === '1';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function fetchJsonOrNull(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // 5-second timeout — we don't want to block the build on a slow CDN
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function ageMs(json, freshnessKey) {
  const ts = json?.[freshnessKey];
  if (!ts) return Infinity;
  const parsed = Date.parse(ts);
  if (Number.isNaN(parsed)) return Infinity;
  return Date.now() - parsed;
}

/**
 * Try to populate a local cache file from prior data; return parsed data
 * + age info on hit, null on miss.
 *
 * On cache hit, this writes the cached JSON to localPath (so downstream
 * steps in the build pipeline see the file) and returns
 * { data, ageHours, source }. On miss, returns null.
 *
 * @param {object}  opts
 * @param {string}  opts.localPath     absolute path to the cache file
 * @param {string=} opts.remoteUrl     optional fallback URL (deployed site)
 * @param {string=} opts.freshnessKey  JSON key holding the ISO timestamp
 *                                     (default: 'fetched_at')
 * @param {number}  opts.maxAgeMs      freshness threshold in milliseconds
 * @returns {Promise<null | { data: any, ageHours: number, source: 'local' | 'remote' }>}
 */
export async function tryLoadCache({
  localPath,
  remoteUrl,
  freshnessKey = 'fetched_at',
  maxAgeMs,
}) {
  if (FORCE_REFRESH) return null;
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return null;

  // 1. Local file
  const local = readJsonIfExists(localPath);
  if (local) {
    const age = ageMs(local, freshnessKey);
    if (age < maxAgeMs) {
      return {
        data: local,
        ageHours: Math.round((age / 3_600_000) * 10) / 10,
        source: 'local',
      };
    }
  }

  // 2. Remote file (deployed site as cache)
  if (remoteUrl) {
    const remote = await fetchJsonOrNull(remoteUrl);
    if (remote) {
      const age = ageMs(remote, freshnessKey);
      if (age < maxAgeMs) {
        // Write to local so downstream build steps find it where they expect
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, JSON.stringify(remote, null, 2), 'utf8');
        return {
          data: remote,
          ageHours: Math.round((age / 3_600_000) * 10) / 10,
          source: 'remote',
        };
      }
    }
  }

  return null;
}

/**
 * Whether the current run was launched with FORCE_REFRESH=1.
 * Useful for logging.
 */
export function isForceRefresh() {
  return FORCE_REFRESH;
}
