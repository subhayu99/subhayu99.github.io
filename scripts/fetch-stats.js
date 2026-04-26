#!/usr/bin/env node

/**
 * Fetch GitHub stats for the upstream template repo.
 *
 * Outputs (under client/public/data/):
 *   - template-stats.json         — full snapshot consumed by the TUI
 *   - template-stats-badge.json   — shields.io endpoint badge schema
 *
 * Auth precedence:
 *   1. GITHUB_TOKEN (CI default)
 *   2. GH_TOKEN
 *   3. `gh auth token` (local dev)
 *   4. unauthenticated (60 req/hr — works for small fork lists)
 *
 * Owner-scoped endpoints (traffic/clones, traffic/views) silently skip
 * when the token lacks `repo` scope or the script runs unauthenticated.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { UPSTREAM_TEMPLATE_REPO } from './utils/load-template-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'client', 'public', 'data');
const OUT_FILE = join(OUT_DIR, 'template-stats.json');
const BADGE_FILE = join(OUT_DIR, 'template-stats-badge.json');

const REPO = UPSTREAM_TEMPLATE_REPO;

/**
 * Code-search queries that catch derivatives of this template.
 *
 * Each query runs its own pass; results are deduped by repo full_name.
 * Forks (already counted via the forks API) and the upstream itself are
 * filtered out.
 *
 * Query selection criteria (in order of importance):
 *   1. Identifier MUST exist since the initial commit (d8e8503) so even
 *      year-old derivatives match. Fresh strings only catch fresh forks.
 *   2. Identifier MUST be imported/referenced across many template files
 *      so a forker can't trivially delete it without breaking their build.
 *   3. Identifier MUST be specific enough that random portfolios / tutorials
 *      / boilerplate won't trigger false positives.
 *
 * NOTE: GitHub's legacy /search/code REST endpoint silently ignores the
 * `path:` qualifier — works in `gh search code` (new infra) but not here.
 * So we rely on string-uniqueness alone.
 *
 * Each query runs sequentially with a small delay between calls to avoid
 * the secondary rate limit on /search/code (≤30 req/min, in practice less).
 */
/**
 * Queries are tiered by specificity:
 *   - 'specific': identifier likely unique to this template's codebase
 *   - 'weak':     identifier present but more likely to coincide with
 *                 unrelated portfolios (only used to corroborate)
 *
 * Confidence per repo:
 *   - high:   matched ≥2 specific queries  (very likely a derivative)
 *   - medium: matched 1 specific query     (likely a derivative)
 *   - low:    matched only weak queries    (skipped from the count)
 *
 * Reported orphan count = high + medium.
 */
const ORPHAN_QUERIES = [
  // Function defined in client/src/lib/portfolioData.ts since the initial
  // commit (d8e8503). Imported wherever experience dates are formatted —
  // forks that kept the timeline command still reference it.
  { q: `formatExperiencePeriod`, tier: 'specific' },
  // Hook defined in client/src/hooks/usePWA.ts since day 1. Reads `?cmd=`
  // from the URL — load-bearing for the terminal boot flow so forkers
  // can't trivially delete it.
  { q: `useURLCommand`, tier: 'specific' },
  // Function defined in client/src/hooks/useTerminal.ts since day 1.
  // 13 hits across all of GitHub — extremely template-specific.
  { q: `getCollapsibleId`, tier: 'specific' },
  // Built-HTML signature — only catches derivatives that committed their
  // dist/ output (rare; kept for completeness).
  { q: `"terminal-portfolio-template:${REPO}"`, tier: 'specific' },
];

const ORPHAN_QUERY_DELAY_MS = 2500;

function safeGhAuthToken() {
  try {
    return execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || safeGhAuthToken() || null;
}

const TOKEN = getToken();

async function ghApi(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`GitHub API ${res.status}: ${path}\n${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fetchAllForks() {
  const all = [];
  let page = 1;
  while (true) {
    const forks = await ghApi(
      `/repos/${REPO}/forks?sort=stargazers&per_page=100&page=${page}`,
    );
    if (forks.length === 0) break;
    all.push(...forks);
    if (forks.length < 100) break;
    page++;
    if (page > 50) break; // safety cap (5,000 forks)
  }
  return all;
}

function inferDeployedUrl(fork) {
  const owner = fork.owner.login;
  if (fork.name === `${owner}.github.io`) {
    return `https://${owner}.github.io`;
  }
  return `https://${owner}.github.io/${fork.name}/`;
}

function shapeShowcase(fork) {
  return {
    owner: fork.owner.login,
    avatar: fork.owner.avatar_url,
    repo: fork.name,
    repo_url: fork.html_url,
    site_url: inferDeployedUrl(fork),
    has_pages: !!fork.has_pages,
    stars: fork.stargazers_count,
    pushed_at: fork.pushed_at,
  };
}

async function tryFetch(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ⚠️  ${label} unavailable (${err.status || 'error'})`);
    return null;
  }
}

/**
 * Run every ORPHAN_QUERY, dedupe by repo full_name, exclude the upstream
 * and any repo already counted via the forks API.
 *
 * @param {Array<{full_name: string}>} forks - Forks list from /repos/:repo/forks
 * @returns {Promise<Array<{repo: string, owner: string, html_url: string, matched_via: string}>>}
 */
async function fetchOrphans(forks) {
  const knownForks = new Set(forks.map((f) => f.full_name));
  // repo full_name → { repo, owner, html_url, matched: Set<string>, tiers: Set<string> }
  const candidates = new Map();

  for (let i = 0; i < ORPHAN_QUERIES.length; i++) {
    const { q, tier } = ORPHAN_QUERIES[i];
    if (i > 0) await new Promise((r) => setTimeout(r, ORPHAN_QUERY_DELAY_MS));

    const result = await tryFetch(`code search "${q.slice(0, 40)}"`, () =>
      ghApi(`/search/code?q=${encodeURIComponent(q)}&per_page=100`),
    );
    if (!result?.items) continue;

    let newThisQuery = 0;
    for (const item of result.items) {
      const repo = item.repository.full_name;
      if (repo === REPO) continue;
      if (knownForks.has(repo)) continue;
      if (!candidates.has(repo)) {
        candidates.set(repo, {
          repo,
          owner: item.repository.owner.login,
          html_url: item.repository.html_url,
          matched: new Set(),
          tiers: new Set(),
        });
        newThisQuery++;
      }
      const c = candidates.get(repo);
      c.matched.add(q);
      c.tiers.add(tier);
    }
    console.log(
      `     · "${q.slice(0, 40)}" → ${result.total_count ?? '?'} hits, ${newThisQuery} new candidates`,
    );
  }

  // Score every candidate, filter out 'low' confidence (only weak queries matched).
  const orphans = [];
  for (const c of candidates.values()) {
    const specificMatches = [...c.matched].filter(
      (m) => ORPHAN_QUERIES.find((x) => x.q === m)?.tier === 'specific',
    );
    let confidence;
    if (specificMatches.length >= 2) confidence = 'high';
    else if (specificMatches.length === 1) confidence = 'medium';
    else confidence = 'low';

    if (confidence === 'low') continue;

    orphans.push({
      repo: c.repo,
      owner: c.owner,
      html_url: c.html_url,
      confidence,
      matched_via: [...c.matched],
    });
  }

  // Sort by confidence first, then alphabetically — keeps the JSON stable
  // and high-confidence ones rendered first in the showcase.
  orphans.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
    return a.repo.localeCompare(b.repo);
  });
  return orphans;
}

async function main() {
  console.log(`📊 Fetching stats for ${REPO}...`);
  console.log(`   auth: ${TOKEN ? 'token present' : 'unauthenticated (60 req/hr)'}\n`);

  const repo = await ghApi(`/repos/${REPO}`);
  console.log(
    `  ⭐ ${repo.stargazers_count} stars · 🍴 ${repo.forks_count} forks · ${repo.subscribers_count} watchers · template=${repo.is_template}`,
  );

  const forks = repo.forks_count > 0 ? await fetchAllForks() : [];
  console.log(`  📑 ${forks.length} forks fetched`);

  const showcase = forks.map(shapeShowcase);
  const deployedForks = showcase.filter((f) => f.has_pages);
  console.log(`  🌐 ${deployedForks.length} forks have GitHub Pages enabled`);

  const orphanRepos = await fetchOrphans(forks);
  const orphanDerivatives = orphanRepos.length;
  const highCount = orphanRepos.filter((o) => o.confidence === 'high').length;
  const mediumCount = orphanRepos.filter((o) => o.confidence === 'medium').length;
  console.log(
    `  🔍 ${orphanDerivatives} orphan derivatives via code search (lower bound, weeks-lagged)`,
  );
  console.log(
    `     ${highCount} high-confidence (≥2 specific matches), ${mediumCount} medium (1 specific match)`,
  );
  orphanRepos.slice(0, 5).forEach((o) => {
    console.log(`     · ${o.repo} [${o.confidence}]`);
  });
  if (orphanRepos.length > 5)
    console.log(`     · …and ${orphanRepos.length - 5} more`);

  const cloneTraffic = await tryFetch('traffic/clones', () =>
    ghApi(`/repos/${REPO}/traffic/clones`),
  );
  const viewTraffic = await tryFetch('traffic/views', () =>
    ghApi(`/repos/${REPO}/traffic/views`),
  );

  const stats = {
    repo: REPO,
    repo_url: `https://github.com/${REPO}`,
    is_template: !!repo.is_template,
    since: repo.created_at,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    network: repo.network_count,
    watchers: repo.subscribers_count,
    deployed_forks: deployedForks.length,
    orphan_derivatives: orphanDerivatives,
    orphan_repos: orphanRepos.slice(0, 50), // capped to keep JSON small
    traffic:
      cloneTraffic && viewTraffic
        ? {
            clones_14d: cloneTraffic.count,
            unique_cloners_14d: cloneTraffic.uniques,
            views_14d: viewTraffic.count,
            unique_viewers_14d: viewTraffic.uniques,
          }
        : null,
    showcase,
    last_updated: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(stats, null, 2));
  console.log(`\n✅ Wrote ${OUT_FILE}`);

  // shields.io endpoint badge: https://shields.io/badges/endpoint-badge
  const headlineCount = deployedForks.length || forks.length;
  const badge = {
    schemaVersion: 1,
    label: 'forks deployed',
    message: headlineCount > 0 ? `${headlineCount}+` : '0',
    color: headlineCount > 0 ? 'brightgreen' : 'lightgrey',
    cacheSeconds: 3600,
  };
  writeFileSync(BADGE_FILE, JSON.stringify(badge, null, 2));
  console.log(`✅ Wrote ${BADGE_FILE}`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
