import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  FileVideo,
  ChevronDown,
  UploadCloud,
  RefreshCw,
  Search,
  Lock,
  Download,
  Loader2,
  AlertCircle,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  uploadVideo,
  listVideos,
  downloadUrl,
  type Video,
} from '../utils/api'

const ACTIVE_STATUSES = new Set([
  'transcribing', 'cleaning', 'generating_audio', 'syncing', 'rendering',
])

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  transcribing: 'Transcribing…',
  cleaning: 'Cleaning…',
  transcribed: 'Ready to review',
  generating_audio: 'Generating Audio…',
  syncing: 'Syncing…',
  rendering: 'Rendering…',
  completed: 'Completed',
  failed: 'Failed',
}

const PIPELINE_STEPS = ['transcribing', 'cleaning', 'generating_audio', 'syncing', 'rendering']

function stepOf(status: string) {
  const i = PIPELINE_STEPS.indexOf(status)
  return i >= 0 ? `Step ${i + 1}/5` : null
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-videos', label: 'My Videos', icon: FileVideo },
] as const

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchVideos = useCallback(async () => {
    try {
      const data = await listVideos()
      setVideos(data)
      const hasActive = data.some((v) => ACTIVE_STATUSES.has(v.status))
      pollRef.current = setTimeout(fetchVideos, hasActive ? 2000 : 15000)
    } catch {
      pollRef.current = setTimeout(fetchVideos, 10000)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [fetchVideos])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
      toast.error('Please upload a video file.')
      return
    }
    setUploading(true)
    try {
      const { id } = await uploadVideo(file)
      navigate(`/editor/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  const handleRefresh = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    fetchVideos()
    toast.success('Refreshed')
  }

  const handleNavClick = (id: string) => {
    setActiveNav(id)
    if (id === 'my-videos') {
      document.getElementById('my-videos-section')?.scrollIntoView({ behavior: 'smooth' })
    } else if (id !== 'dashboard') {
      toast.info(`${NAV_ITEMS.find((n) => n.id === id)?.label} coming soon`)
    }
  }

  const filteredVideos = videos.filter((v) => {
    const matchSearch = v.filename.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'processing' && ACTIVE_STATUSES.has(v.status)) ||
      (filter === 'completed' && v.status === 'completed') ||
      (filter === 'failed' && v.status === 'failed')
    return matchSearch && matchFilter
  })

  return (
    <div className="flex flex-col h-screen bg-[#f4f3ee] overflow-hidden">

      {/* ── Header ── */}
      <header className="h-16 bg-white border-b border-[#1a1a1a]/10 flex items-center justify-between px-6 shrink-0 z-30">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-violet flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[#1a1a1a] text-lg tracking-tight">
            Video<span className="text-brand-violet">Polish</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-sm text-[#6e6e65] hover:text-[#1a1a1a] px-3 py-2 rounded-lg hover:bg-[#f4f3ee] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          {/* User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e4e2dc] bg-white hover:bg-[#f7f6f2] transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-brand-violet flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <span className="text-sm font-semibold text-[#1a1a1a] max-w-32 truncate">
                {displayName}
              </span>
              <ChevronDown className="w-4 h-4 text-[#9a9892] shrink-0" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-[#e4e2dc] shadow-xl shadow-black/8 py-1 z-50">
                <div className="px-4 py-3 border-b border-[#f4f3ee]">
                  <p className="text-xs text-[#9a9892] mb-0.5">Signed in as</p>
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={async () => {
                    setUserMenuOpen(false)
                    await signOut()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-60 bg-[#f4f3ee] border-r border-[#e4e2dc] flex flex-col shrink-0">
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  activeNav === item.id
                    ? 'bg-brand-light text-brand-violet'
                    : 'text-[#6e6e65] hover:bg-[#e8ede5] hover:text-[#1a1a1a]'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {'badge' in item && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-violet text-white rounded-md leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
              dragOver
                ? 'border-brand-violet bg-brand-light/20'
                : 'bg-[#f4f3ee] border-[#d8d5ce] hover:border-brand-violet/50'
            } ${uploading ? 'pointer-events-none opacity-75' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.webm,.avi,.mkv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />

            <div className="flex flex-col items-center py-12 px-6 text-center">
              {uploading ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-5">
                    <Loader2 className="w-8 h-8 text-brand-violet animate-spin" />
                  </div>
                  <p className="text-base font-semibold text-[#1a1a1a]">
                    Uploading and starting pipeline…
                  </p>
                </>
              ) : (
                <>
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
                      dragOver ? 'bg-brand-violet' : 'bg-brand-light'
                    }`}
                  >
                    <UploadCloud
                      className={`w-8 h-8 transition-colors ${dragOver ? 'text-white' : 'text-brand-violet'}`}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-1.5">
                    Upload your video to get started
                  </h3>
                  <p className="text-sm text-[#9a9892]">
                    Drop your video file here, or browse to upload
                  </p>
                  <p className="text-sm text-[#9a9892] mb-7">
                    Supports: mp4, mov, webm, avi, mkv
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-violet text-white text-sm font-semibold rounded-xl shadow-md shadow-brand-violet/20 hover:bg-brand-indigo transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Choose File
                  </button>

                  <div className="flex items-center gap-1.5 mt-6 text-xs text-[#9a9892]">
                    <Lock className="w-3.5 h-3.5" />
                    Your videos are secure and private
                  </div>
                </>
              )}
            </div>
          </div>

          {/* My Videos */}
          <div id="my-videos-section">
            {/* Heading row */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1a1a1a]">My Videos</h2>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9892] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-[#e4e2dc] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 w-48 placeholder:text-[#aaa89e] text-[#1a1a1a]"
                  />
                </div>
                {/* Filter */}
                <div className="relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none pl-4 pr-9 py-2 text-sm border border-[#e4e2dc] rounded-xl bg-white text-[#1a1a1a] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
                  >
                    <option value="all">All Videos</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9892] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List container */}
            <div className="bg-white rounded-2xl border border-[#e4e2dc] overflow-hidden">
              {filteredVideos.length === 0 ? (
                <EmptyState
                  hasSearch={search.length > 0 || filter !== 'all'}
                  onUpload={() => fileInputRef.current?.click()}
                />
              ) : (
                <div className="divide-y divide-[#f4f3ee]">
                  {filteredVideos.map((video) => (
                    <VideoRow key={video.id} video={video} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Empty state ── */
function EmptyState({
  hasSearch,
  onUpload,
}: {
  hasSearch: boolean
  onUpload: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl border-2 border-[#e4e2dc] bg-[#f4f3ee] flex items-center justify-center mb-4">
        <FileVideo className="w-7 h-7 text-brand-violet/40" />
      </div>
      <h3 className="text-base font-semibold text-[#1a1a1a] mb-1">
        {hasSearch ? 'No matching videos' : 'No videos yet'}
      </h3>
      <p className="text-sm text-[#9a9892] mb-6 max-w-xs">
        {hasSearch
          ? 'Try adjusting your search or filter.'
          : 'Upload your first video to get started with AI-powered enhancements.'}
      </p>
      {!hasSearch && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-violet text-white text-sm font-semibold rounded-xl shadow-md shadow-brand-violet/20 hover:bg-brand-indigo transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          Upload Video
        </button>
      )}
    </div>
  )
}

/* ── Video row ── */
function VideoRow({ video }: { video: Video }) {
  const navigate = useNavigate()
  const isActive = ACTIVE_STATUSES.has(video.status)
  const isCompleted = video.status === 'completed'
  const isFailed = video.status === 'failed'
  const isReviewable = video.status === 'transcribed'

  const date = new Date(video.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#f7f6f2] transition-colors">
        {/* Status icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isCompleted
              ? 'bg-[#e8ede5]'
              : isFailed
                ? 'bg-red-100'
                : isActive
                  ? 'bg-brand-light'
                  : 'bg-[#f4f3ee]'
          }`}
        >
          {isActive ? (
            <Loader2 className="w-4.5 h-4.5 text-brand-violet animate-spin" />
          ) : isCompleted ? (
            <svg className="w-4 h-4 text-brand-violet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : isFailed ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <FileVideo className="w-4 h-4 text-[#9a9892]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1a1a1a] truncate max-w-xs">
              {video.filename}
            </span>
            <StatusBadge status={video.status} />
            {isActive && stepOf(video.status) && (
              <span className="text-xs text-[#9a9892]">{stepOf(video.status)}</span>
            )}
          </div>
          <p className="text-xs text-[#9a9892] mt-0.5">
            {date} · Voice: <span className="capitalize">{video.voice}</span>
          </p>
          {isFailed && video.error_message && (
            <p className="text-xs text-red-500 mt-1 font-mono line-clamp-2">
              {video.error_message.split('\n')[0]}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isReviewable && (
            <button
              onClick={() => navigate(`/editor/${video.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-violet text-white font-semibold rounded-lg hover:bg-brand-indigo transition-colors cursor-pointer"
            >
              Review Transcript
            </button>
          )}
          {isCompleted && (
            <button
              onClick={() => navigate(`/editor/${video.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#1a1a1a] border border-[#e4e2dc] rounded-lg hover:bg-[#f4f3ee] cursor-pointer transition-colors"
            >
              Open Editor
            </button>
          )}
          {isCompleted && (
            <a
              href={downloadUrl(video.id)}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-violet text-white font-semibold rounded-lg hover:bg-brand-indigo transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          {isFailed && (
            <button
              onClick={() => navigate(`/editor/${video.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-violet text-white font-semibold rounded-lg hover:bg-brand-indigo transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>

    </>
  )
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const base = 'px-2 py-0.5 rounded-full text-[11px] font-semibold'
  if (status === 'completed')
    return <span className={`${base} bg-green-100 text-green-700`}>{STATUS_LABELS[status]}</span>
  if (status === 'failed')
    return <span className={`${base} bg-red-100 text-red-700`}>{STATUS_LABELS[status]}</span>
  if (status === 'transcribed')
    return <span className={`${base} bg-amber-100 text-amber-700`}>{STATUS_LABELS[status]}</span>
  if (ACTIVE_STATUSES.has(status))
    return <span className={`${base} bg-brand-light text-brand-violet`}>{STATUS_LABELS[status]}</span>
  return (
    <span className={`${base} bg-[#f4f3ee] text-[#6e6e65]`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
