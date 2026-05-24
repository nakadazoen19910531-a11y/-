/**
 * API クライアントユーティリティ
 * JWT トークンの自動付与・エラーハンドリングを一元管理
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

// ローカルストレージからトークンを取得
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// 共通ヘッダーを構築
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// API エラークラス
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// レスポンスを処理してエラーを統一的にスロー
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = `HTTPエラー ${res.status}`;
  try {
    const body = await res.json();
    message = body.error || body.message || message;
  } catch {}

  throw new ApiError(res.status, message);
}

// ===== 汎用リクエスト関数 =====

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiPost<T = unknown>(
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return handleResponse<T>(res);
}

// マルチパート（ファイルアップロード）用
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse<T>(res);
}

// ===== 施工計画書ダウンロード（Blob） =====

export async function downloadPlan(planId: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/plans/${planId}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'ダウンロードに失敗しました');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== 型定義 =====

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
}

export interface Plan {
  id: string;
  projectName: string;
  projectType: string;
  contractNumber: string;
  location: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
  client: string;
  contractor: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_exists: boolean;
  status: 'completed' | 'processing' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PlansResponse {
  status: string;
  plans: Plan[];
}

export interface GenerateResponse {
  status: string;
  plan_id: string;
  filename: string;
  download_url: string;
}

export interface ExtractResponse {
  status: string;
  extracted_data: {
    projectName?: string;
    contractNumber?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    contractAmount?: string;
    client?: string;
  };
  warnings?: string[] | null;
}

// ===== テンプレート =====

export interface Template {
  id: string;
  name: string;
  description: string;
  original_filename: string;
  created_at: string;
  size: number;
  file_exists: boolean;
}

export interface TemplatesResponse {
  status: string;
  templates: Template[];
  total: number;
}

export async function getTemplates(): Promise<TemplatesResponse> {
  return apiGet<TemplatesResponse>('/templates/');
}

export async function uploadTemplate(
  file: File,
  name: string,
  description: string
): Promise<{ status: string; template: Template }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('description', description);
  return apiUpload<{ status: string; template: Template }>('/templates/', formData);
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiDelete(`/templates/${id}`);
}

export async function downloadTemplate(id: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/templates/${id}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'テンプレートのダウンロードに失敗しました');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== 過去事例（施工計画書） =====

export interface PastCase {
  id: string;
  name: string;
  description: string;
  project_type: string;
  client: string;
  location: string;
  year: string;
  original_filename: string;
  size: number;
  created_at: string;
  uploaded_by: string;
  file_exists: boolean;
}

export interface PastCasesResponse {
  status: string;
  past_cases: PastCase[];
  total: number;
}

export async function getPastCases(): Promise<PastCasesResponse> {
  return apiGet<PastCasesResponse>('/past-cases/');
}

export async function uploadPastCase(
  file: File,
  fields: {
    name: string;
    description?: string;
    project_type?: string;
    client?: string;
    location?: string;
    year?: string;
  }
): Promise<{ status: string; past_case: PastCase }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', fields.name);
  formData.append('description', fields.description || '');
  formData.append('project_type', fields.project_type || '');
  formData.append('client', fields.client || '');
  formData.append('location', fields.location || '');
  formData.append('year', fields.year || '');
  return apiUpload<{ status: string; past_case: PastCase }>('/past-cases/', formData);
}

export async function deletePastCase(id: string): Promise<void> {
  await apiDelete(`/past-cases/${id}`);
}

export async function downloadPastCase(id: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/past-cases/${id}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, '過去事例のダウンロードに失敗しました');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
