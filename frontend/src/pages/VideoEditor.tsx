import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Sparkles, ArrowLeft, Play, Download, Send,
  CheckCircle2, Loader2, FileVideo, Mic, AlertCircle, Square,
} from 'lucide-react'
import {
  getVideo, getSegments, updateVideo, processVideo, continueVideo,
  chatWithVideo, updateSegment, recaptionVideo,
  fetchVideoUrl, triggerDownload, triggerSrtDownload,
  type Video, type Segment,
} from '../utils/api'

// ── Caption styles ────────────────────────────────────────────────────────

const CAPTION_STYLES = [
  { id: 'none',            name: 'None',           desc: 'No captions' },
  { id: 'classic',        name: 'Classic',         desc: 'White text, outline' },
  { id: 'bold_pop',       name: 'Bold Pop',        desc: 'Large yellow text' },
  { id: 'cinematic',      name: 'Cinematic',       desc: 'Bar + uppercase' },
  { id: 'word_highlight', name: 'Word Highlight',  desc: 'Word by word' },
]

function CaptionPreview({ styleId }: { styleId: string }) {
  return (
    <div className="relative w-full rounded overflow-hidden bg-gradient-to-b from-slate-600 to-slate-900" style={{ aspectRatio: '9/16' }}>
      <div className="absolute inset-0 opacity-20">
        <div className="h-2/5 bg-slate-500 rounded-sm mx-2 mt-2" />
        <div className="h-1/5 bg-slate-600 rounded-sm mx-3 mt-1" />
      </div>
      {styleId === 'none' && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center">
          <span className="text-gray-500 text-[6px]">—</span>
        </div>
      )}
      {styleId === 'classic' && (
        <div className="absolute bottom-2 inset-x-0 text-center px-1">
          <span className="text-white text-[7px] font-medium leading-none"
            style={{ textShadow: '-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000' }}>
            Hello world
          </span>
        </div>
      )}
      {styleId === 'bold_pop' && (
        <div className="absolute bottom-2 inset-x-0 text-center px-1">
          <span className="text-yellow-400 text-[9px] font-black leading-none"
            style={{ textShadow: '-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000' }}>
            Hello world
          </span>
        </div>
      )}
      {styleId === 'cinematic' && (
        <div className="absolute bottom-0 inset-x-0 bg-black/60 py-1.5 text-center">
          <span className="text-white text-[6px] tracking-widest uppercase font-medium leading-none">
            Hello world
          </span>
        </div>
      )}
      {styleId === 'word_highlight' && (
        <div className="absolute bottom-2 inset-x-0 text-center px-1">
          <span className="text-gray-400 text-[7px] leading-none"
            style={{ textShadow: '-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000' }}>Hello </span>
          <span className="text-yellow-400 text-[7px] font-bold leading-none"
            style={{ textShadow: '-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000' }}>world</span>
        </div>
      )}
    </div>
  )
}

// ── Voice catalog ─────────────────────────────────────────────────────────

const VOICES = [
  { id: 'alloy',   name: 'Drew',   gender: 'Male',   desc: 'Casual, curious and fun' },
  { id: 'echo',    name: 'Viraj',  gender: 'Male',   desc: 'Energetic and confident' },
  { id: 'nova',    name: 'Hope',   gender: 'Female', desc: 'Professional and clear' },
  { id: 'fable',   name: 'Justin', gender: 'Male',   desc: 'Relaxed, helpful and balanced' },
  { id: 'onyx',    name: 'Elon',   gender: 'Male',   desc: 'Deep and natural' },
  { id: 'shimmer', name: 'Chloe',  gender: 'Female', desc: 'Lively and expressive' },
]

function voiceLabel(id: string) {
  const v = VOICES.find(v => v.id === id)
  return v ? `${v.name} | ${v.gender}` : id
}

// ── Progress definitions ───────────────────────────────────────────────────

const TRANSCRIPTION_STEPS = [
  { status: 'transcribing', label: 'Listening to your video' },
  { status: 'transcribing', label: 'Extracting audio track' },
  { status: 'cleaning',     label: 'Turning speech into text' },
  { status: 'cleaning',     label: 'Fixing mistakes and cleaning up' },
]

const RENDER_STEPS = [
  { status: 'generating_audio', label: 'Generating your voiceover' },
  { status: 'syncing',          label: 'Syncing audio to video' },
  { status: 'rendering',        label: 'Rendering your final cut' },
]

function transcriptionStepsDone(status: string): number {
  if (status === 'transcribing') return 0
  if (status === 'cleaning')    return 2
  if (status === 'transcribed') return 4
  return 1
}

function renderStepsDone(status: string): number {
  if (status === 'syncing')    return 1
  if (status === 'rendering')  return 2
  if (status === 'completed')  return 3
  return 0
}

function renderProgress(status: string): number {
  if (status === 'generating_audio') return 15
  if (status === 'syncing')          return 50
  if (status === 'rendering')        return 80
  if (status === 'completed')        return 100
  return 0
}

// ── Message types ──────────────────────────────────────────────────────────

type Widget =
  | { type: 'voice-picker' }
  | { type: 'transcript'; segments: Segment[] }
  | { type: 'transcription-progress' }
  | { type: 'render-progress' }
  | { type: 'download' }
  | { type: 'retry-transcribe' }
  | { type: 'retry-render' }

interface MsgAction {
  label: string
  variant: 'primary' | 'secondary'
  onClick: () => void
}

interface Msg {
  id: string
  role: 'ai' | 'user'
  label?: string
  text: string
  widget?: Widget
  actions?: MsgAction[]
}

// ── Stage type ─────────────────────────────────────────────────────────────

type Stage =
  | 'welcome'        // status: uploaded — pick voice
  | 'voice-picked'   // voice chosen, confirm to transcribe
  | 'transcribing'   // phase 1 running
  | 'reviewing'      // status: transcribed — edit transcript
  | 'generating'     // phase 2 running
  | 'done'           // status: completed
  | 'recaptioning'   // re-burning captions on existing render
  | 'failed'

// ── Helpers ────────────────────────────────────────────────────────────────

function statusToStage(status: string): Stage {
  if (status === 'uploaded')    return 'welcome'
  if (status === 'transcribing' || status === 'cleaning') return 'transcribing'
  if (status === 'transcribed') return 'reviewing'
  if (['generating_audio', 'syncing', 'rendering'].includes(status)) return 'generating'
  if (status === 'completed')    return 'done'
  if (status === 'recaptioning') return 'recaptioning'
  if (status === 'failed')      return 'failed'
  return 'welcome'
}

let _msgCounter = 0
function makeId() { return `msg-${++_msgCounter}` }

// ── Main component ─────────────────────────────────────────────────────────

export default function VideoEditor() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()

  const [video, setVideo]         = useState<Video | null>(null)
  const [msgs, setMsgs]           = useState<Msg[]>([])
  const [stage, setStage]         = useState<Stage>('welcome')
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const pollRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef   = useRef<HTMLTextAreaElement>(null)
  const stageRef  = useRef<Stage>('welcome')

  // ── Scroll to bottom on new messages ───
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // ── Push a message ───
  const pushMsg = useCallback((msg: Omit<Msg, 'id'>) => {
    setMsgs(prev => [...prev, { ...msg, id: makeId() }])
  }, [])

  const setStageSync = useCallback((s: Stage) => {
    stageRef.current = s
    stageRef.current = s
    setStage(s)
  }, [])

  // ── Build conversation from video status ───
  const buildConversation = useCallback((vid: Video, segs: Segment[]) => {
    const s = statusToStage(vid.status)
    const msgs: Omit<Msg, 'id'>[] = []

    // User: file attachment
    msgs.push({ role: 'user', text: vid.filename })

    // AI: welcome
    const isPreVoice = s === 'welcome' || s === 'transcribing'
    msgs.push({
      role: 'ai',
      label: 'Video uploaded',
      text: s === 'transcribing'
        ? `Got it! I've already started transcribing your video. Pick a voice for the narration while I work on it:`
        : `Got it! I've got your video ready. Now let's give it the Clipkatha treatment — cleaner pacing, polished audio, and a fresh narration.\n\nPick a voice for the narration:`,
      widget: isPreVoice ? { type: 'voice-picker' } : undefined,
    })

    if (isPreVoice) {
      setMsgs(msgs.map(m => ({ ...m, id: makeId() })))
      setStageSync('welcome')
      return
    }

    // User: voice choice (reconstruct from video.voice)
    msgs.push({ role: 'user', text: voiceLabel(vid.voice) })

    // AI: voice confirmed
    msgs.push({
      role: 'ai',
      label: 'Voice selected',
      text: `${voiceLabel(vid.voice).split(' | ')[0]} is locked in and ready to go. Nothing's permanent — you can switch voices anytime. Ready for me to transcribe your video?`,
    })

    if (s === 'voice-picked') {
      setMsgs(msgs.map(m => ({ ...m, id: makeId() })))
      setStageSync('voice-picked')
      return
    }

    // User: confirmed
    msgs.push({ role: 'user', text: 'Yes, transcribe it' })

    // AI: transcribing progress (only reached when reconstructing from cleaning/transcribed+ states)
    msgs.push({
      role: 'ai',
      label: 'Transcribing…',
      text: `On it. I'm listening to your video and converting the speech to text — cleaning up filler words along the way.`,
      widget: { type: 'transcription-progress' },
    })

    if (s === 'failed' && segs.length === 0) {
      const copy = msgs.map(m => m.widget?.type === 'transcription-progress' ? { ...m, widget: undefined } : m)
      copy.push({ role: 'ai', label: 'Failed', text: vid.error_message?.split('\n')[0] ?? 'Something went wrong during transcription.', widget: { type: 'retry-transcribe' } })
      setMsgs(copy.map(m => ({ ...m, id: makeId() })))
      setStageSync('failed')
      return
    }

    // AI: transcript ready (transcribed / reviewing / generating / done)
    msgs.push({
      role: 'ai',
      label: 'Transcript ready',
      text: `Done! Here's your cleaned transcript. Edit any line directly, or type an instruction below — I'll apply it across the relevant segments. When you're happy, hit Generate.`,
      widget: { type: 'transcript', segments: segs },
    })

    if (s === 'reviewing') {
      setMsgs(msgs.map(m => ({ ...m, id: makeId() })))
      setStageSync('reviewing')
      return
    }

    // User: generate
    msgs.push({ role: 'user', text: 'Generate video' })

    // AI: render progress
    msgs.push({
      role: 'ai',
      label: 'Generating your video…',
      text: `Perfect. Generating the voiceover, syncing it to your video, and rendering the final cut.`,
      widget: { type: 'render-progress' },
    })

    if (s === 'generating') {
      setMsgs(msgs.map(m => ({ ...m, id: makeId() })))
      setStageSync('generating')
      return
    }

    if (s === 'failed') {
      const copy = msgs.map(m => m.widget?.type === 'render-progress' ? { ...m, widget: undefined } : m)
      copy.push({ role: 'ai', label: 'Failed', text: vid.error_message?.split('\n')[0] ?? 'Something went wrong while generating your video.', widget: { type: 'retry-render' } })
      setMsgs(copy.map(m => ({ ...m, id: makeId() })))
      setStageSync('failed')
      return
    }

    // AI: done
    msgs.push({
      role: 'ai',
      label: 'Done!',
      text: `Your video is ready! Download it below or watch the preview on the right.`,
      widget: { type: 'download' },
    })

    setMsgs(msgs.map(m => ({ ...m, id: makeId() })))
    setStageSync('done')
  }, [])

  // ── Load video on mount ───
  useEffect(() => {
    if (!videoId) return
    ;(async () => {
      try {
        const [vid, segs] = await Promise.all([
          getVideo(videoId),
          getSegments(videoId).catch(() => [] as Segment[]),
        ])
        setVideo(vid)
        buildConversation(vid, segs)
        setInitialized(true)
      } catch {
        toast.error('Could not load video')
        navigate('/dashboard')
      }
    })()
  }, [videoId, buildConversation, navigate])

  // ── Polling ───
  const poll = useCallback(async () => {
    if (!videoId) return
    try {
      const vid = await getVideo(videoId)
      setVideo(vid)

      const prev     = stageRef.current
      const newStage = statusToStage(vid.status)

      if (prev === 'transcribing' && newStage === 'reviewing') {
        setStageSync('reviewing')
        const segs = await getSegments(videoId)
        setMsgs(all => {
          if (all.some(m => m.widget?.type === 'transcript')) return all
          const copy = all.map(m =>
            m.widget?.type === 'transcription-progress' ? { ...m, widget: undefined } : m
          )
          copy.push({
            id: makeId(), role: 'ai', label: 'Transcript ready',
            text: `Done! Here's your cleaned transcript. Edit any line directly, or type an instruction below. When you're happy, hit Generate.`,
            widget: { type: 'transcript', segments: segs } as Widget,
          })
          return copy
        })
      } else if (prev === 'generating' && newStage === 'done') {
        setStageSync('done')
        setMsgs(all => {
          if (all.some(m => m.widget?.type === 'download')) return all
          const copy = all.map(m =>
            m.widget?.type === 'render-progress' ? { ...m, widget: undefined } : m
          )
          copy.push({
            id: makeId(), role: 'ai', label: 'Done!',
            text: 'Your video is ready! Download it below or watch the preview on the right.',
            widget: { type: 'download' } as Widget,
          })
          return copy
        })
      } else if (prev === 'transcribing' && newStage === 'failed') {
        setStageSync('failed')
        setMsgs(all => {
          if (all.some(m => m.widget?.type === 'retry-transcribe')) return all
          const copy = all.map(m => m.widget?.type === 'transcription-progress' ? { ...m, widget: undefined } : m)
          copy.push({ id: makeId(), role: 'ai', label: 'Failed', text: vid.error_message?.split('\n')[0] ?? 'Something went wrong during transcription.', widget: { type: 'retry-transcribe' } as Widget })
          return copy
        })
      } else if (prev === 'generating' && newStage === 'failed') {
        setStageSync('failed')
        setMsgs(all => {
          if (all.some(m => m.widget?.type === 'retry-render')) return all
          const copy = all.map(m => m.widget?.type === 'render-progress' ? { ...m, widget: undefined } : m)
          copy.push({ id: makeId(), role: 'ai', label: 'Failed', text: vid.error_message?.split('\n')[0] ?? 'Something went wrong while generating your video.', widget: { type: 'retry-render' } as Widget })
          return copy
        })
      } else if (prev === 'recaptioning' && newStage === 'done') {
        setStageSync('done')
      }

      const shouldPoll = ['transcribing', 'cleaning', 'generating_audio', 'syncing', 'rendering', 'recaptioning'].includes(vid.status)
      if (shouldPoll) {
        pollRef.current = setTimeout(poll, 2500)
      }
    } catch {
      pollRef.current = setTimeout(poll, 5000)
    }
  }, [videoId, setStageSync])

  useEffect(() => {
    if (!initialized) return
    if (stage === 'transcribing' || stage === 'generating' || stage === 'recaptioning') {
      pollRef.current = setTimeout(poll, 2500)
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [initialized, stage, poll])

  // ── Handlers ───

  const handleVoicePick = async (voiceId: string) => {
    if (!videoId) return
    try {
      const [, freshVideo] = await Promise.all([
        updateVideo(videoId, { voice: voiceId }),
        getVideo(videoId),
      ])
      setVideo(v => v ? { ...v, voice: voiceId } : v)

      const vLabel = voiceLabel(voiceId)
      const firstName = vLabel.split(' | ')[0]
      pushMsg({ role: 'user', text: vLabel })

      if (freshVideo.status === 'transcribed') {
        const segs = await getSegments(videoId)
        pushMsg({
          role: 'ai',
          label: 'Transcript ready',
          text: `${firstName} is locked in! Transcription already finished — here's your cleaned transcript. Edit any line directly, or type an instruction below. When you're happy, hit Generate.`,
          widget: { type: 'transcript', segments: segs },
        })
        setStageSync('reviewing')
      } else if (freshVideo.status === 'transcribing' || freshVideo.status === 'cleaning') {
        pushMsg({
          role: 'ai',
          label: 'Voice selected',
          text: `${firstName} is locked in! Transcription is still running — I'll show you the transcript as soon as it's done.`,
          widget: { type: 'transcription-progress' },
        })
        setStageSync('transcribing')
        pollRef.current = setTimeout(poll, 2500)
      } else {
        // Fallback: status is 'uploaded' (edge case — show manual confirm button)
        pushMsg({
          role: 'ai',
          label: 'Voice selected',
          text: `${firstName} is locked in and ready to go. Nothing's permanent — you can switch voices anytime. Ready for me to transcribe your video?`,
          actions: [{ label: 'Yes, transcribe it', variant: 'primary', onClick: handleStartTranscription }],
        })
        setStageSync('voice-picked')
      }
    } catch {
      toast.error('Could not update voice')
    }
  }

  const handleStartTranscription = async () => {
    if (!videoId) return
    try {
      await processVideo(videoId)
      // Remove actions from last AI message
      setMsgs(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, actions: undefined } : m
      ))
      pushMsg({ role: 'user', text: 'Yes, transcribe it' })
      pushMsg({
        role: 'ai',
        label: 'Transcribing…',
        text: `On it. I'm listening to your video and converting the speech to text — cleaning up filler words along the way.`,
        widget: { type: 'transcription-progress' },
      })
      setStageSync('transcribing')
      pollRef.current = setTimeout(poll, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start transcription')
    }
  }

  const handleGenerateVideo = async (captionStyle: string) => {
    if (!videoId) return
    try {
      await updateVideo(videoId, { caption_style: captionStyle })
      await continueVideo(videoId)
      // Freeze the transcript widget
      setMsgs(prev => prev.map(m =>
        m.widget?.type === 'transcript' ? { ...m, widget: undefined, actions: undefined } : m
      ))
      pushMsg({ role: 'user', text: 'Generate video' })
      pushMsg({
        role: 'ai',
        label: 'Generating your video…',
        text: `Perfect. Generating the voiceover, syncing it to your video, and rendering the final cut.`,
        widget: { type: 'render-progress' },
      })
      setStageSync('generating')
      pollRef.current = setTimeout(poll, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start generation')
    }
  }

  const handleRetryTranscribe = async () => {
    if (!videoId) return
    try {
      await processVideo(videoId)
      setMsgs(prev => {
        const copy = prev.filter(m => m.label !== 'Failed')
        copy.push({ id: makeId(), role: 'ai', label: 'Transcribing…', text: `On it. I'm listening to your video and converting the speech to text — cleaning up filler words along the way.`, widget: { type: 'transcription-progress' } })
        return copy
      })
      setStageSync('transcribing')
      pollRef.current = setTimeout(poll, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start transcription')
    }
  }

  const handleRetryRender = async () => {
    if (!videoId) return
    try {
      await continueVideo(videoId)
      setMsgs(prev => {
        const copy = prev.filter(m => m.label !== 'Failed')
        copy.push({ id: makeId(), role: 'ai', label: 'Generating your video…', text: `Perfect. Generating the voiceover, syncing it to your video, and rendering the final cut.`, widget: { type: 'render-progress' } })
        return copy
      })
      setStageSync('generating')
      pollRef.current = setTimeout(poll, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start generation')
    }
  }

  const handleRecaption = async (captionStyle: string) => {
    if (!videoId) return
    try {
      await recaptionVideo(videoId, captionStyle)
      setStageSync('recaptioning')
      pollRef.current = setTimeout(poll, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply captions')
    }
  }

  const handleChatSend = async () => {
    const msg = chatInput.trim()
    if (!msg || !videoId || chatLoading) return
    setChatInput('')
    setChatLoading(true)
    pushMsg({ role: 'user', text: msg })
    try {
      const res = await chatWithVideo(videoId, msg)
      // Update the transcript widget in-place
      setMsgs(prev => {
        const copy = [...prev]
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].widget?.type === 'transcript') {
            copy[i] = { ...copy[i], widget: { type: 'transcript', segments: res.segments } }
            break
          }
        }
        return copy
      })
      pushMsg({ role: 'ai', text: res.reply })
    } catch {
      toast.error('Something went wrong — try again')
    } finally {
      setChatLoading(false)
    }
  }

  const handleSegmentEdit = async (seg: Segment, newText: string) => {
    if (!videoId) return
    try {
      const updated = await updateSegment(videoId, seg.id, newText)
      setMsgs(prev => prev.map(m => {
        if (m.widget?.type !== 'transcript') return m
        const w = m.widget as { type: 'transcript'; segments: Segment[] }
        return { ...m, widget: { type: 'transcript', segments: w.segments.map(s => s.id === updated.id ? updated : s) } }
      }))
    } catch {
      toast.error('Could not save segment')
    }
  }

  const twoColumn = !['welcome', 'voice-picked'].includes(stage)

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-100 flex items-center justify-between px-5 shrink-0 z-10 bg-white">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-violet flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">
              Clip<span className="text-brand-violet">katha</span>
            </span>
          </Link>
        </div>
        {video && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileVideo className="w-3.5 h-3.5" />
            <span className="truncate max-w-48">{video.filename}</span>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Chat panel ── */}
        <div className={`flex flex-col ${twoColumn ? 'w-[560px] border-r border-gray-100' : 'flex-1'} overflow-hidden`}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {!twoColumn && (
              <div className="max-w-xl mx-auto space-y-6">
                {msgs.map(m => (
                  <ChatBubble
                    key={m.id}
                    msg={m}
                    video={video}
                    videoId={videoId!}
                    stage={stage}
                    onVoicePick={handleVoicePick}
                    onGenerateVideo={handleGenerateVideo}
                    onSegmentEdit={handleSegmentEdit}
                    onRetryTranscribe={handleRetryTranscribe}
                    onRetryRender={handleRetryRender}
                    onRecaption={handleRecaption}
                  />
                ))}
              </div>
            )}
            {twoColumn && msgs.map(m => (
              <ChatBubble
                key={m.id}
                msg={m}
                video={video}
                videoId={videoId!}
                stage={stage}
                onVoicePick={handleVoicePick}
                onGenerateVideo={handleGenerateVideo}
                onSegmentEdit={handleSegmentEdit}
                onRetryTranscribe={handleRetryTranscribe}
                onRetryRender={handleRetryRender}
                onRecaption={handleRecaption}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Chat input (only during review) */}
          {stage === 'reviewing' && (
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-brand-violet/40 focus-within:ring-2 focus-within:ring-brand-violet/10 transition-all">
                <textarea
                  ref={chatRef}
                  rows={1}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() }
                  }}
                  placeholder="e.g. make the intro more punchy, remove the last sentence…"
                  className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none leading-relaxed max-h-24"
                  style={{ height: 'auto', minHeight: '24px' }}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-1.5 rounded-lg bg-brand-violet text-white disabled:opacity-40 hover:bg-brand-indigo transition-colors shrink-0"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 px-1">
                Describe a change and I'll apply it · <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          )}
        </div>

        {/* ── Preview panel ── */}
        {twoColumn && (
          <PreviewPanel video={video} videoId={videoId!} stage={stage} />
        )}
      </div>
    </div>
  )
}

// ── ChatBubble dispatcher ─────────────────────────────────────────────────

function ChatBubble({
  msg, video, videoId, stage,
  onVoicePick, onGenerateVideo, onSegmentEdit, onRetryTranscribe, onRetryRender, onRecaption,
}: {
  msg: Msg
  video: Video | null
  videoId: string
  stage: Stage
  onVoicePick: (id: string) => void
  onGenerateVideo: (captionStyle: string) => void
  onSegmentEdit: (seg: Segment, text: string) => void
  onRetryTranscribe: () => void
  onRetryRender: () => void
  onRecaption: (captionStyle: string) => void
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xs">
          <p className="text-sm text-gray-800">{msg.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 max-w-lg">
      {msg.label && (
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{msg.label}</p>
      )}
      {msg.text && (
        <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
      )}

      {/* Widgets */}
      {msg.widget?.type === 'voice-picker' && (
        <VoicePickerWidget onPick={onVoicePick} currentVoice={video?.voice} />
      )}
      {msg.widget?.type === 'transcription-progress' && (
        <TranscriptionProgressWidget video={video} />
      )}
      {msg.widget?.type === 'transcript' && (
        <TranscriptWidget
          segments={msg.widget.segments}
          isEditable={stage === 'reviewing'}
          videoId={videoId}
          onEdit={onSegmentEdit}
          onGenerate={onGenerateVideo}
        />
      )}
      {msg.widget?.type === 'render-progress' && (
        <RenderProgressWidget video={video} />
      )}
      {msg.widget?.type === 'download' && (
        <DownloadWidget videoId={videoId} video={video} stage={stage} onRecaption={onRecaption} />
      )}
      {msg.widget?.type === 'retry-transcribe' && (
        <button
          onClick={onRetryTranscribe}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Try again
        </button>
      )}
      {msg.widget?.type === 'retry-render' && (
        <button
          onClick={onRetryRender}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Generate again
        </button>
      )}

      {/* Inline actions (for voice-confirmed step) */}
      {msg.actions && (
        <div className="flex gap-2 flex-wrap">
          {msg.actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={
                a.variant === 'primary'
                  ? 'px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer'
                  : 'px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer'
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── VoicePickerWidget ─────────────────────────────────────────────────────

function VoicePickerWidget({ onPick, currentVoice }: {
  onPick: (id: string) => void
  currentVoice?: string
}) {
  const [selected, setSelected] = useState<string>(currentVoice || '')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePreview = (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation()

    if (playingId === voiceId) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    audioRef.current?.pause()
    const audio = new Audio(`/api/voices/${voiceId}/preview`)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => { toast.error('Could not load preview'); setPlayingId(null) }
    audioRef.current = audio
    audio.play()
    setPlayingId(voiceId)
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white w-full max-w-md">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Pick a voice</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {VOICES.map(v => (
          <button
            key={v.id}
            onClick={() => setSelected(v.id)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all cursor-pointer ${
              selected === v.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <button
              onClick={e => handlePreview(e, v.id)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title={playingId === v.id ? 'Stop preview' : 'Preview voice'}
            >
              {playingId === v.id
                ? <Square className="w-3 h-3 text-blue-500 fill-blue-500" />
                : <Play className="w-3.5 h-3.5 text-gray-500 ml-0.5" />
              }
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{v.name} | {v.gender}</p>
              <p className="text-[11px] text-gray-400 truncate">{v.desc}</p>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full border ml-auto shrink-0 flex items-center justify-center ${
              selected === v.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
            }`}>
              {selected === v.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-4">
        <button
          disabled={!selected}
          onClick={() => selected && onPick(selected)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
        >
          Use this voice
        </button>
      </div>
    </div>
  )
}

// ── TranscriptionProgressWidget ───────────────────────────────────────────

function TranscriptionProgressWidget({ video }: { video: Video | null }) {
  const done = transcriptionStepsDone(video?.status || 'transcribing')
  const isFinished = video?.status === 'transcribed'

  return (
    <div className="space-y-2 py-1">
      {TRANSCRIPTION_STEPS.map((step, i) => {
        const isDone = i < done
        const isCurrent = i === done && !isFinished
        return (
          <div key={i} className="flex items-center gap-3">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            ) : isCurrent ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-gray-200 shrink-0" />
            )}
            <span className={`text-sm ${isDone ? 'text-gray-500' : isCurrent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── RenderProgressWidget ──────────────────────────────────────────────────

function RenderProgressWidget({ video }: { video: Video | null }) {
  const status = video?.status || 'generating_audio'
  const done = renderStepsDone(status)
  const progress = renderProgress(status)
  const currentStep = RENDER_STEPS[done]?.label || 'Finalizing…'

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-white space-y-4 max-w-sm">
      <div className="space-y-2">
        {RENDER_STEPS.map((step, i) => {
          const isDone = i < done
          const isCurrent = i === done && status !== 'completed'
          return (
            <div key={i} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-200 shrink-0" />
              )}
              <span className={`text-sm ${isDone ? 'text-gray-500' : isCurrent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">Your video is being generated</p>
          <span className="text-xs font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400">{currentStep}</p>
      </div>
    </div>
  )
}


// ── TranscriptWidget ──────────────────────────────────────────────────────

function TranscriptWidget({ segments, isEditable, videoId, onEdit, onGenerate }: {
  segments: Segment[]
  isEditable: boolean
  videoId: string
  onEdit: (seg: Segment, text: string) => void
  onGenerate: (captionStyle: string) => void
}) {
  const [localTexts, setLocalTexts] = useState<Record<number, string>>(() =>
    Object.fromEntries(segments.map(s => [s.id, s.cleaned_text || s.original_text]))
  )
  const [captionStyle, setCaptionStyle] = useState('none')
  const [focusedId, setFocusedId] = useState<number | null>(null)

  useEffect(() => {
    setLocalTexts(prev => {
      const next = Object.fromEntries(segments.map(s => [s.id, s.cleaned_text || s.original_text]))
      if (focusedId !== null && prev[focusedId] !== undefined) {
        next[focusedId] = prev[focusedId]
      }
      return next
    })
  }, [segments])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white w-full">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{segments.length} segments</p>
        {isEditable && (
          <a
            href={`/api/videos/${videoId}/export/srt`}
            download
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Export SRT
          </a>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {segments.map(seg => (
          <div key={seg.id} className="px-5 py-3">
            <p className="text-[10px] font-mono text-gray-400 mb-2">
              {fmt(seg.original_start)} – {fmt(seg.original_end)}
            </p>
            <div className="space-y-1.5">
              {isEditable ? (
                <textarea
                  className="w-full text-sm text-gray-800 resize-none bg-transparent focus:outline-none focus:bg-gray-50 rounded px-1 -mx-1 transition-colors leading-relaxed"
                  rows={Math.max(1, Math.ceil((localTexts[seg.id] || '').length / 60))}
                  value={localTexts[seg.id] || ''}
                  onChange={e => setLocalTexts(prev => ({ ...prev, [seg.id]: e.target.value }))}
                  onFocus={() => setFocusedId(seg.id)}
                  onBlur={() => { setFocusedId(null); onEdit(seg, localTexts[seg.id] || '') }}
                />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed">
                  {seg.cleaned_text || seg.original_text}
                </p>
              )}
              {seg.cleaned_text && seg.cleaned_text !== seg.original_text && (
                <p className="text-[11px] text-gray-400 line-through leading-relaxed">
                  {seg.original_text}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {isEditable && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Captions <span className="text-gray-400 font-normal">— optional</span></p>
            <div className="grid grid-cols-5 gap-1.5">
              {CAPTION_STYLES.map(cs => (
                <button
                  key={cs.id}
                  onClick={() => setCaptionStyle(cs.id)}
                  className={`flex flex-col gap-1.5 p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                    captionStyle === cs.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <CaptionPreview styleId={cs.id} />
                  <p className={`text-[9px] font-semibold leading-tight ${captionStyle === cs.id ? 'text-blue-700' : 'text-gray-700'}`}>{cs.name}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onGenerate(captionStyle)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Generate video
          </button>
        </div>
      )}
    </div>
  )
}

// ── DownloadWidget ────────────────────────────────────────────────────────

function DownloadWidget({ videoId, video, stage, onRecaption }: {
  videoId: string
  video: Video | null
  stage: Stage
  onRecaption: (captionStyle: string) => void
}) {
  const [captionStyle, setCaptionStyle] = useState(video?.caption_style || 'none')
  const [downloading, setDownloading] = useState(false)
  const isApplying = stage === 'recaptioning'
  const isUnchanged = captionStyle === (video?.caption_style || 'none')

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await triggerDownload(videoId, `polished_${videoId}.mp4`)
    } catch {
      toast.error('Download failed — try again')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-3 max-w-sm">
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 transition-colors cursor-pointer"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'Downloading…' : 'Download video'}
        </button>
        <button
          onClick={() => triggerSrtDownload(videoId, `subtitles_${videoId}.srt`)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Export SRT
        </button>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">
        <p className="text-xs font-medium text-gray-500">Change captions</p>
        <div className="grid grid-cols-5 gap-1.5">
          {CAPTION_STYLES.map(cs => (
            <button
              key={cs.id}
              onClick={() => setCaptionStyle(cs.id)}
              disabled={isApplying}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-center transition-all cursor-pointer disabled:opacity-40 ${
                captionStyle === cs.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <p className={`text-[10px] font-semibold leading-tight ${captionStyle === cs.id ? 'text-blue-700' : 'text-gray-700'}`}>{cs.name}</p>
              <p className="text-[9px] text-gray-400 leading-tight">{cs.desc}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => onRecaption(captionStyle)}
          disabled={isApplying || isUnchanged}
          className="w-full py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {isApplying ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</> : 'Apply'}
        </button>
      </div>
    </div>
  )
}

// ── PreviewPanel ──────────────────────────────────────────────────────────

function PreviewPanel({ video, videoId, stage }: {
  video: Video | null
  videoId: string
  stage: Stage
}) {
  const [playing, setPlaying] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [videoSrc, setVideoSrc] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const isDone = stage === 'done'

  useEffect(() => {
    fetchVideoUrl(videoId, isDone ? 'download' : 'source')
      .then(url => setVideoSrc(url))
      .catch(() => {})
  }, [videoId, isDone, video?.updated_at])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause() } else { videoRef.current.play() }
    setPlaying(p => !p)
  }

  const handleMetadata = () => {
    const el = videoRef.current
    if (el && el.videoWidth && el.videoHeight) {
      setAspectRatio(el.videoWidth / el.videoHeight)
    }
  }

  // portrait (< 1) → constrain by height; landscape/square → fill full width
  const isPortrait = aspectRatio !== null && aspectRatio < 1
  const videoBoxStyle = aspectRatio
    ? { aspectRatio: String(aspectRatio), ...(isPortrait ? { maxHeight: '72vh' } : { width: '100%' }) }
    : { aspectRatio: '16/9', width: '100%' }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-4 gap-4 overflow-hidden">
      {stage === 'transcribing' || stage === 'generating' ? (
        <div className="w-full aspect-video rounded-2xl bg-[#e8eaf0] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-sm text-gray-400">
            {stage === 'transcribing' ? 'Transcribing your video…' : 'Generating your video…'}
          </p>
        </div>
      ) : (
        <div style={videoBoxStyle}>
          <div className="relative rounded-2xl overflow-hidden bg-black w-full h-full">
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleMetadata}
              onEnded={() => setPlaying(false)}
            />
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
              onClick={togglePlay}
            >
              {!playing && (
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-gray-900 ml-0.5" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chips */}
      <div className="flex gap-2 flex-wrap justify-center">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
          <FileVideo className="w-3.5 h-3.5" />
          Source: {video?.filename?.split('.').pop()?.toUpperCase() || 'MP4'}
        </div>
        {video?.voice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600">
            <Mic className="w-3.5 h-3.5" />
            Voice: {voiceLabel(video.voice).split(' | ')[0]}
          </div>
        )}
        {stage === 'done' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-xs text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </div>
        )}
      </div>

      {stage === 'failed' && (
        <div className="flex flex-col items-center gap-1 text-sm text-red-500 text-center max-w-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{video?.error_message?.split('\n')[0] ?? 'Something went wrong.'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
