import { Novel, Volume, Chapter, ApiConfig, Provider, Progress, IdeaDimensions } from './types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const config = localStorage.getItem('apiConfig');
  if (config) {
    const { apiKey, baseUrl, model } = JSON.parse(config) as ApiConfig;
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (baseUrl) headers['X-Base-URL'] = baseUrl;
    if (model) headers['X-Model'] = model;
  }
  
  const locale = localStorage.getItem('locale') || 'zh';
  headers['X-Locale'] = locale;
  
  return headers;
}

// Novels API
export async function getNovels(): Promise<Novel[]> {
  const res = await fetch(`${API_BASE}/novels`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch novels');
  return res.json();
}

export async function getNovel(id: number): Promise<Novel> {
  const res = await fetch(`${API_BASE}/novels/${id}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch novel');
  return res.json();
}

export async function createNovel(data: { title: string; category: string; user_idea: string; word_count: number }): Promise<Novel> {
  const res = await fetch(`${API_BASE}/novels`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create novel');
  return res.json();
}

export async function deleteNovel(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/novels/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete novel');
}

export async function confirmNovel(id: number): Promise<Novel> {
  const res = await fetch(`${API_BASE}/novels/${id}/confirm`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to confirm novel');
  return res.json();
}

export async function updateOutline(id: number, volumes: Partial<Volume>[]): Promise<Novel> {
  const res = await fetch(`${API_BASE}/novels/${id}/outline`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ volumes }),
  });
  if (!res.ok) throw new Error('Failed to update outline');
  return res.json();
}

export async function generateOutline(id: number): Promise<Novel> {
  const res = await fetch(`${API_BASE}/novels/${id}/generate-outline`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to generate outline');
  return res.json();
}

export async function generateNovel(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/novels/${id}/generate`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to start generation');
  return res.json();
}

export async function stopGeneration(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/novels/${id}/stop`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to stop generation');
  return res.json();
}

export async function getProgress(id: number): Promise<Progress> {
  const res = await fetch(`${API_BASE}/novels/${id}/progress`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to get progress');
  return res.json();
}

export async function updateChapter(id: number, chapterId: number, content: string): Promise<Chapter> {
  const res = await fetch(`${API_BASE}/novels/${id}/chapters/${chapterId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update chapter');
  return res.json();
}

export async function downloadTxt(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/novels/${id}/download`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to download');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const novel = await getNovel(id);
  a.download = `${novel.title}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportEpub(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/novels/${id}/export/epub`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to export');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const novel = await getNovel(id);
  a.download = `${novel.title}.epub`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function downloadChapterTxt(novelId: number, chapterId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/novels/${novelId}/chapters/${chapterId}/download/txt`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to download chapter');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const novel = await getNovel(novelId);
  const volume = novel.volumes?.find(v => v.chapters?.some(c => c.id === chapterId));
  const chapter = volume?.chapters?.find(c => c.id === chapterId);
  a.download = `${chapter?.title || 'chapter'}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportChapterEpub(novelId: number, chapterId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/novels/${novelId}/chapters/${chapterId}/export/epub`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to export chapter');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const novel = await getNovel(novelId);
  const volume = novel.volumes?.find(v => v.chapters?.some(c => c.id === chapterId));
  const chapter = volume?.chapters?.find(c => c.id === chapterId);
  a.download = `${chapter?.title || 'chapter'}.epub`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Providers API
export async function getProviders(): Promise<Provider[]> {
  const res = await fetch(`${API_BASE}/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  return res.json();
}

export async function testApi(apiKey: string, baseUrl: string, model: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/test-api`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ api_key: apiKey, base_url: baseUrl, model }),
  });
  if (!res.ok) throw new Error('Failed to test API');
  return res.json();
}

// Suggest options
export async function suggestOptions(dimension: string, context: string, useAi = false, category = ''): Promise<string[]> {
  const res = await fetch(`${API_BASE}/suggest-options`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ dimension, context, use_ai: useAi, category }),
  });
  if (!res.ok) throw new Error('Failed to get suggestions');
  return res.json();
}

// Demo API
export async function demoSeed(): Promise<Novel> {
  const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST', headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to seed demo');
  return res.json();
}

export async function demoSeedEn(): Promise<Novel> {
  const res = await fetch(`${API_BASE}/demo/seed-en`, { method: 'POST', headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to seed demo');
  return res.json();
}

export async function demoGenerateOutline(id: number): Promise<Novel> {
  const res = await fetch(`${API_BASE}/demo/generate-outline/${id}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to generate outline');
  return res.json();
}
