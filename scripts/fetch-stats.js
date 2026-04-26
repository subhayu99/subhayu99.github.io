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
const SIGNATURE_QUERY = `terminal-portfolio-template:${REPO}`;

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

  const orphanResult = await tryFetch('code search (orphans)', () =>
    ghApi(`/search/code?q=${encodeURIComponent(SIGNATURE_QUERY)}&per_page=1`),
  );
  const orphanDerivatives = orphanResult?.total_count ?? null;
  console.log(
    `  🔍 ${orphanDerivatives ?? 'unknown'} orphan derivatives (code search; lower bound, weeks-lagged)`,
  );

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
