/**
 * Mode Analytics Integration for FunnelAI
 * Pulls retention, usage, churn, and funnel data from Mode reports.
 * 
 * Authentication: Mode uses API tokens (Token + Secret) via Basic Auth
 * API Base: https://app.mode.com/api/{workspace}
 */

const MODE_API_BASE = 'https://app.mode.com/api';

function getModeCredentials() {
  const apiToken = process.env.MODE_API_TOKEN;
  const apiSecret = process.env.MODE_API_SECRET;
  const workspace = process.env.MODE_WORKSPACE;

  if (!apiToken || !apiSecret || !workspace) {
    return null;
  }

  return { apiToken, apiSecret, workspace };
}

function getAuthHeader(apiToken: string, apiSecret: string): string {
  const credentials = Buffer.from(`${apiToken}:${apiSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

async function modeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const creds = getModeCredentials();
  if (!creds) throw new Error('Mode credentials not configured');

  const url = `${MODE_API_BASE}/${creds.workspace}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(creds.apiToken, creds.apiSecret),
      'Accept': 'application/hal+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MODE] API error at ${endpoint}:`, response.status, errorText);
    throw new Error(`Mode API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function testModeConnection(): Promise<{
  success: boolean;
  error?: string;
  workspace?: string;
}> {
  try {
    const creds = getModeCredentials();
    if (!creds) {
      return { success: false, error: 'Mode credentials not configured. Set MODE_API_TOKEN, MODE_API_SECRET, and MODE_WORKSPACE.' };
    }

    const credentials = Buffer.from(`${creds.apiToken}:${creds.apiSecret}`).toString('base64');
    const verifyResponse = await fetch(`${MODE_API_BASE}/verify`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/hal+json',
      },
    });

    if (!verifyResponse.ok) {
      if (verifyResponse.status === 401) {
        return { success: false, error: 'Invalid API credentials.' };
      }
      return { success: false, error: `Mode API error: ${verifyResponse.status}` };
    }

    // Test workspace access
    const wsResponse = await fetch(`${MODE_API_BASE}/${creds.workspace}`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/hal+json',
      },
    });

    if (!wsResponse.ok) {
      return { success: false, error: `Workspace "${creds.workspace}" not accessible.` };
    }

    return { success: true, workspace: creds.workspace };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getModeReports(): Promise<Array<{
  token: string;
  name: string;
  description: string | null;
  createdAt: string;
  lastRunAt: string | null;
  webUrl: string;
}>> {
  try {
    const data = await modeRequest('/reports');
    const reports = data._embedded?.reports || [];

    return reports.map((report: any) => ({
      token: report.token,
      name: report.name,
      description: report.description,
      createdAt: report.created_at,
      lastRunAt: report.last_run_at,
      webUrl: report._links?.web?.href || '',
    }));
  } catch (error) {
    console.error('[MODE] Failed to fetch reports:', error);
    return [];
  }
}

export async function getModeReportRuns(reportToken: string, limit = 5): Promise<Array<{
  token: string;
  state: string;
  completedAt: string | null;
  createdAt: string;
}>> {
  try {
    const data = await modeRequest(`/reports/${reportToken}/runs?page[size]=${limit}`);
    const runs = data._embedded?.report_runs || [];

    return runs.map((run: any) => ({
      token: run.token,
      state: run.state,
      completedAt: run.completed_at,
      createdAt: run.created_at,
    }));
  } catch (error) {
    console.error('[MODE] Failed to fetch report runs:', error);
    return [];
  }
}

export async function getModeReportQueries(reportToken: string): Promise<Array<{
  token: string;
  name: string;
  rawQuery: string;
}>> {
  try {
    const data = await modeRequest(`/reports/${reportToken}/queries`);
    const queries = data._embedded?.queries || [];

    return queries.map((query: any) => ({
      token: query.token,
      name: query.name,
      rawQuery: query.raw_query,
    }));
  } catch (error) {
    console.error('[MODE] Failed to fetch queries:', error);
    return [];
  }
}

export async function getModeQueryResults(
  reportToken: string,
  runToken: string,
  queryToken: string
): Promise<{ columns: string[]; data: any[][] } | null> {
  try {
    const creds = getModeCredentials();
    if (!creds) return null;

    const credentials = Buffer.from(`${creds.apiToken}:${creds.apiSecret}`).toString('base64');
    const url = `${MODE_API_BASE}/${creds.workspace}/reports/${reportToken}/runs/${runToken}/query_runs/${queryToken}/results/content.csv`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}` },
    });

    if (!response.ok) throw new Error(`Failed: ${response.status}`);

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return null;

    const columns = lines[0].split(',').map(c => c.replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line =>
      line.split(',').map(cell => {
        const trimmed = cell.replace(/^"|"$/g, '');
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
      })
    );

    return { columns, data };
  } catch (error) {
    console.error('[MODE] Failed to fetch query results:', error);
    return null;
  }
}

export async function triggerModeReportRun(reportToken: string): Promise<{ runToken: string; state: string } | null> {
  try {
    const data = await modeRequest(`/reports/${reportToken}/runs`, {
      method: 'POST',
      body: JSON.stringify({ parameters: {} }),
    });

    return { runToken: data.token, state: data.state };
  } catch (error) {
    console.error('[MODE] Failed to trigger report run:', error);
    return null;
  }
}

export function isModeConfigured(): boolean {
  return getModeCredentials() !== null;
}
