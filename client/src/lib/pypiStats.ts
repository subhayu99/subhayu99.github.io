import { apiConfig } from '../config';

export interface PyPIPackageStats {
  name: string;
  total_all_time: number;
  total_180d: number;
  last_day: number;
  last_week: number;
  last_month: number;
  daily: { date: string; downloads: number }[];
  weekly: { date: string; downloads: number }[];
}

export interface PyPIStatsData {
  fetched_at: string;
  total_downloads: number;
  packages: Record<string, PyPIPackageStats>;
}

const BASE_URL = import.meta.env.BASE_URL || '/';

export async function loadPyPIStats(): Promise<PyPIStatsData | null> {
  try {
    const response = await fetch(`${BASE_URL}data/pypi-stats.json`, {
      signal: AbortSignal.timeout(apiConfig.query.timeout),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
