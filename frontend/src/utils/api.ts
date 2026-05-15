import { supabase } from '../lib/supabase'

const BASE = '/api'

export interface Video {
  id: string
  filename: string
  status: string
  voice: string
  caption_style?: string | null
  error_message?: string
  created_at: string
  updated_at: string
}

export interface Segment {
  id: number
  index: number
  original_start: number
  original_end: number
  original_text: string
  cleaned_text?: string
  tts_duration?: number
}

export interface ChatResponse {
  reply: string
  segments: Segment[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadVideo(file: File, voice?: string): Promise<{ id: string; status: string }> {
  const form = new FormData()
  form.append('file', file)
  if (voice) form.append('voice', voice)
  return request('/videos', { method: 'POST', body: form })
}

export async function listVideos(): Promise<Video[]> {
  return request('/videos')
}

export async function getVideo(id: string): Promise<Video> {
  return request(`/videos/${id}`)
}

export async function updateVideo(id: string, patch: { voice?: string; caption_style?: string }): Promise<Video> {
  return request(`/videos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export async function processVideo(id: string): Promise<{ id: string; status: string }> {
  return request(`/videos/${id}/process`, { method: 'POST' })
}

export async function continueVideo(id: string): Promise<{ id: string; status: string }> {
  return request(`/videos/${id}/continue`, { method: 'POST' })
}

export async function getSegments(id: string): Promise<Segment[]> {
  return request(`/videos/${id}/segments`)
}

export async function updateSegment(
  videoId: string,
  segId: number,
  cleanedText: string,
): Promise<Segment> {
  return request(`/videos/${videoId}/segments/${segId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cleaned_text: cleanedText }),
  })
}

export async function chatWithVideo(videoId: string, message: string): Promise<ChatResponse> {
  return request(`/videos/${videoId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

export async function recaptionVideo(id: string, captionStyle: string): Promise<{ id: string; status: string }> {
  return request(`/videos/${id}/recaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caption_style: captionStyle }),
  })
}

export async function fetchVideoUrl(id: string, type: 'source' | 'download'): Promise<string> {
  const { url } = await request<{ url: string }>(`/videos/${id}/file-url?type=${type}`)
  return url
}

export async function triggerDownload(id: string, filename: string): Promise<void> {
  const { url } = await request<{ url: string }>(`/videos/${id}/file-url?type=download`)
  // Fetch as blob so a.download is respected — browsers ignore a.download for cross-origin URLs
  // (e.g. R2 presigned URLs). The blob URL is same-origin so the filename is preserved.
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
}

export async function triggerSrtDownload(id: string, filename: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers()
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)
  const res = await fetch(`${BASE}/videos/${id}/export/srt`, { headers })
  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
