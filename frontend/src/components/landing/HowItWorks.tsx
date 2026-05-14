import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Upload, FileText, Wand2, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Slide {
  title: string
  description: string
  tip: string
  visual: React.ReactNode
}

const slides: Slide[] = [
  {
    title: 'Upload Your Video',
    description: 'Drop in any recording — mp4, mov, webm, avi. Pick an AI voice and hit Polish.',
    tip: 'Supports files up to several GB. The pipeline runs fully server-side.',
    visual: <UploadVisual />,
  },
  {
    title: 'AI Transcription',
    description: 'Every word is mapped to a precise timestamp for clean, accurate cuts.',
    tip: 'Word-level timestamps let us cut cleanly between real speech and filler.',
    visual: <TranscriptVisual />,
  },
  {
    title: 'AI Script Cleanup',
    description: 'AI reads each segment and strips filler words, false starts, and hesitations.',
    tip: '"Um", "uh", "you know", "like" — gone. Natural pauses are preserved.',
    visual: <CleanupVisual />,
  },
  {
    title: 'Download & Share',
    description: 'FFmpeg renders the final polished mp4 — clean audio, perfect timing.',
    tip: 'The output file is a standard mp4 ready for any platform.',
    visual: <DownloadVisual />,
  },
]

export const HowItWorksContent: React.FC<{ onComplete?: () => void; className?: string }> = ({
  onComplete,
  className = '',
}) => {
  const [current, setCurrent] = useState(0)

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1)
    else onComplete?.()
  }

  const prev = () => {
    if (current > 0) setCurrent(current - 1)
  }

  return (
    <div className={`grid md:grid-cols-2 gap-0 h-full bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden ${className}`}>
      {/* Visual panel */}
      <div className="bg-gray-50/50 p-8 flex items-center justify-center min-h-[300px]">
        <div className="w-full aspect-video bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200/50 flex items-center justify-center">
          {slides[current].visual}
        </div>
      </div>

      {/* Text panel */}
      <div className="p-8 md:p-12 flex flex-col">
        {/* Progress dots */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === current ? 'w-12 bg-brand-violet' : i < current ? 'w-1.5 bg-brand-violet/40' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {slides[current].title}
          </h2>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            {slides[current].description}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-brand-light/60 rounded-full text-sm text-brand-violet self-start">
            <span className="font-medium">{slides[current].tip}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-8">
          <button
            onClick={prev}
            disabled={current === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <span className="hidden lg:block text-sm text-gray-500 font-medium">
            {current + 1} / {slides.length}
          </span>
          <button
            onClick={next}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-[#3d1f66] bg-brand-light hover:bg-[#e2c2ff] transition-colors shadow-lg shadow-[#c49ef5]/25 cursor-pointer"
          >
            {current === slides.length - 1 ? 'Get Started' : 'Next'}
            {current < slides.length - 1 && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
        <div className="lg:hidden text-center mt-4 text-sm text-gray-500 font-medium">
          {current + 1} / {slides.length}
        </div>
      </div>
    </div>
  )
}

function UploadVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-brand-violet/40 bg-brand-light/30 flex items-center justify-center">
        <Upload className="w-9 h-9 text-brand-violet" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">Drop your video here</p>
        <p className="text-xs text-gray-400 mt-1">mp4, mov, webm, avi</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-brand-light text-[#3d1f66] text-sm font-semibold rounded-xl shadow-lg shadow-[#c49ef5]/25">
        Choose File
      </div>
    </div>
  )
}

function TranscriptVisual() {
  const lines = [
    { ts: '0:01', text: 'So today we\'re going to uh talk about...' },
    { ts: '0:04', text: 'um basically the new release and I...' },
    { ts: '0:07', text: '...wanted to show you how it works.' },
    { ts: '0:10', text: 'You know, the pipeline is actually...' },
  ]
  return (
    <div className="w-full h-full flex flex-col justify-center p-6 bg-gray-900 font-mono text-xs gap-2">
      <div className="text-gray-500 mb-2 text-[10px] uppercase tracking-wider flex items-center gap-2">
        <FileText className="w-3 h-3" />
        Transcript
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-brand-violet/70 w-8 shrink-0">{l.ts}</span>
          <span className="text-gray-300">{l.text}</span>
        </div>
      ))}
      <span className="text-gray-500 animate-blink">█</span>
    </div>
  )
}

function CleanupVisual() {
  return (
    <div className="w-full h-full flex flex-col justify-center p-6 gap-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-1">
        <Wand2 className="w-3 h-3" />
        AI cleanup
      </div>
      {[
        { original: 'So today we\'re going to uh talk about', cleaned: 'Today we\'re going to talk about' },
        { original: 'um basically the new release and I', cleaned: 'The new release and I' },
      ].map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="text-xs text-red-400 line-through opacity-70">{r.original}</div>
          <div className="text-xs text-green-600 font-medium">{r.cleaned}</div>
        </div>
      ))}
    </div>
  )
}

function DownloadVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">polished_interview.mp4</p>
        <p className="text-xs text-gray-400 mt-1">Ready to download</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-500/25">
        <Download className="w-4 h-4" />
        Download
      </div>
    </div>
  )
}

const HowItWorks: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section id="how-it-works" className="py-20 bg-transparent relative z-10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-brand-violet/80 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-500 font-light max-w-2xl mx-auto">
              Four steps from raw recording to{' '}
              <span className="font-semibold text-gray-700">polished content.</span>
            </p>
          </div>

          <HowItWorksContent
            onComplete={() => navigate('/dashboard')}
            className="border border-gray-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]"
          />
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
