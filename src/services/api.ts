const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

function buildUrl(path: string) {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${API_BASE_URL}${path}`;
}

function buildHeaders(token?: string, contentType?: string) {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const url = buildUrl(path);
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body instanceof FormData) {
    Object.assign(headers, buildHeaders(token));
    if (headers && typeof headers === 'object') {
      delete (headers as Record<string, string>)['Content-Type'];
    }
  } else {
    const contentType = (options.headers as Record<string, string>)?.['Content-Type'] ?? 'application/json';
    Object.assign(headers, buildHeaders(token, contentType));
  }

  const requestOptions = {
    ...options,
    headers,
  };

  const response = await fetch(url, requestOptions);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorContent = contentType.includes('application/json') ? await response.json() : await response.text();
    const detail = typeof errorContent === 'string' ? errorContent : (errorContent?.detail ?? JSON.stringify(errorContent));
    throw new Error(detail || response.statusText);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return (await response.blob()) as unknown as T;
}

async function requestBlob(path: string, token?: string): Promise<Blob> {
  const url = buildUrl(path);
  const response = await fetch(url, { method: 'GET', headers: buildHeaders(token) });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const errorContent = contentType.includes('application/json') ? await response.json() : await response.text();
    const detail = typeof errorContent === 'string' ? errorContent : (errorContent?.detail ?? JSON.stringify(errorContent));
    throw new Error(detail || response.statusText);
  }
  return response.blob();
}

function normalizeReport(report: any) {
  const typeMap: Record<string, string> = {
    executive_summary: 'Executive Summary',
    client_report: 'Client Report',
    portfolio_report: 'Portfolio Report',
    project_report: 'Project Report',
  };
  const formatMap: Record<string, string> = {
    pdf: 'PDF',
    pptx: 'PPT',
    xlsx: 'Excel',
  };

  const statusMap: Record<string, string> = {
    ready: 'Ready',
    generating: 'Generating',
    failed: 'Failed',
  };

  const rawStatus = report.status || 'ready';
  return {
    ...report,
    type: report.type || typeMap[report.report_type] || typeMap[report.type] || 'Executive Summary',
    format: report.format || formatMap[report.report_format] || formatMap[report.format] || 'PDF',
    generatedAt: report.generated_at || report.generatedAt,
    generatedBy: report.generated_by_id || report.generatedBy || 'System',
    size: report.size || (report.file_path ? 'Generated' : '-'),
    status:
      statusMap[String(rawStatus).toLowerCase()] ||
      String(rawStatus).charAt(0).toUpperCase() + String(rawStatus).slice(1),
  };
}

export async function apiLogin(email: string, password: string) {
  return request<{ access_token: string; token_type: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiMe(token: string) {
  return request<any>('/auth/me', { method: 'GET' }, token);
}

export async function apiListEmployees(token: string) {
  return request<any[]>('/governance/employees', { method: 'GET' }, token);
}

export async function apiListAccounts(token: string) {
  return request<any[]>('/governance/accounts', { method: 'GET' }, token);
}

export async function apiListProjects(token: string) {
  return request<any[]>('/governance/projects', { method: 'GET' }, token);
}

export async function apiListStatuses(token: string) {
  return request<any[]>('/governance/status', { method: 'GET' }, token);
}

export async function apiListReports(token: string) {
  const reports = await request<any[]>('/reports', { method: 'GET' }, token);
  return reports.map(normalizeReport);
}

export async function apiCreateReport(payload: unknown, token: string) {
  const report = await request<any>('/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
  return normalizeReport(report);
}

export async function apiListReportTemplates(token: string) {
  return request<any[]>('/reports/templates', { method: 'GET' }, token);
}

export async function apiUploadReportTemplate(formData: FormData, token: string) {
  return request<any>('/reports/templates', { method: 'POST', body: formData }, token);
}

export async function apiDownloadReport(reportId: string, token: string) {
  return requestBlob(`/reports/${reportId}/download`, token);
}

export async function apiListProviders(token: string) {
  return request<any[]>('/ai/providers', { method: 'GET' }, token);
}

export async function apiRagQuery(payload: unknown, token: string) {
  return request<any>('/ai/rag/query', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function apiCreateAccount(payload: unknown, token: string) {
  return request<any>('/governance/accounts', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function apiCreateProject(payload: unknown, token: string) {
  return request<any>('/governance/projects', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function apiCreateAllocation(payload: unknown, token: string) {
  return request<any>('/governance/allocations', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function apiDeleteAllocation(id: string, token: string) {
  return request<any>(`/governance/allocations/${id}`, { method: 'DELETE' }, token);
}

export async function apiListAllocations(token: string) {
  return request<any[]>('/governance/allocations', { method: 'GET' }, token);
}
