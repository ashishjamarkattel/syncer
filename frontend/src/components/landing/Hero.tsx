import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Mic, Scissors, Volume2 } from 'lucide-react'

const VIDEO_WITHOUT = 'https://pub-4919c2146317426eb560bc9c132a65c4.r2.dev/_previews/screen-capture.webm'
const VIDEO_WITH    = 'https://pub-4919c2146317426eb560bc9c132a65c4.r2.dev/7f9e9e0a-fc1a-4949-b3a7-ed605ac7d5cc/output/polished.mp4'

const Hero: React.FC = () => {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen flex items-center justify-center py-24 overflow-hidden">
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-violet/10 rounded-full blur-[200px] -z-10 pointer-events-none" />
      <div className="absolute top-[25%] left-[30%] w-[300px] h-[300px] bg-brand-indigo/8 rounded-full blur-[150px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-6 max-w-5xl mx-auto leading-[1.05] tracking-tight">
          Raw Takes.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-indigo">
            Polished Results.
          </span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
          Clipkatha removes filler words, cleans your script with AI, and re-voices your content—so every recording sounds like your best take.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {[
            { icon: <Mic className="w-4 h-4" />, label: 'AI Transcription' },
            { icon: <Scissors className="w-4 h-4" />, label: 'AI Filler Removal' },
            { icon: <Volume2 className="w-4 h-4" />, label: 'Voice Re-synthesis' },
          ].map((f) => (
            <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffeb] border border-[#e8e4c8] rounded-full text-sm text-[#1a1a1a] shadow-sm">
              {f.icon}{f.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8 py-4 bg-brand-light text-[#3d1f66] font-bold rounded-xl hover:bg-[#e2c2ff] transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-[#c49ef5]/25 group cursor-pointer"
          >
            Polish a Video
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 bg-[#ffffeb] text-[#1a1a1a] font-semibold rounded-xl hover:bg-[#f5f2d8] transition-all duration-200 flex items-center justify-center gap-2 border border-[#e8e4c8] shadow-sm cursor-pointer"
          >
            See how it works
          </a>
        </div>

        <VideoComparison />
      </div>
    </section>
  )
}

function VideoComparison() {
  const [withApp, setWithApp] = useState(true)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const withRef  = useRef<HTMLVideoElement>(null)
  const withoutRef = useRef<HTMLVideoElement>(null)

  // Keep play/pause in sync with toggle state
  useEffect(() => {
    const active  = withApp ? withRef.current  : withoutRef.current
    const inactive = withApp ? withoutRef.current : withRef.current
    inactive?.pause()
    if (active) {
      paused ? active.pause() : active.play().catch(() => {})
    }
  }, [withApp, paused])

  // Sync mute
  useEffect(() => {
    if (withRef.current)    withRef.current.muted    = muted
    if (withoutRef.current) withoutRef.current.muted = muted
  }, [muted])

  const handleToggle = () => {
    setWithApp(v => !v)
    setPaused(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="relative rounded-3xl p-4 pb-6 shadow-2xl"
        style={{ background: 'linear-gradient(145deg,#a8d4f5 0%,#c2e2f7 40%,#d8eefb 100%)' }}
      >
        {/* Browser chrome */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-black/[0.06]">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#f4f4f4] border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-white rounded-lg h-6 flex items-center px-3 border border-gray-200 max-w-xs mx-auto">
                <span className="text-[10px] text-gray-400">clipkatha.app/editor</span>
              </div>
            </div>
          </div>

          {/* Video area */}
          <div className="relative bg-gray-900" style={{ aspectRatio: '16/9' }}>
            {/* "With Clipkatha" video */}
            <video
              ref={withRef}
              src={VIDEO_WITH}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: withApp ? 1 : 0 }}
              autoPlay
              loop
              muted
              playsInline
            />

            {/* "Without Clipkatha" video */}
            <video
              ref={withoutRef}
              src={VIDEO_WITHOUT}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: withApp ? 0 : 1 }}
              loop
              muted
              playsInline
            />

            {/* Fallback overlay shown when videos are missing */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <noscript>
                <span className="text-white/40 text-sm">Video preview</span>
              </noscript>
            </div>

            {/* Control bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-full shadow-xl"
                style={{ background: 'rgba(30,30,35,0.85)', backdropFilter: 'blur(14px)' }}
              >
                <span className="text-white/55 text-xs font-medium whitespace-nowrap select-none">Without Clipkatha</span>

                {/* iOS toggle */}
                <button
                  onClick={handleToggle}
                  className="relative w-10 h-5 rounded-full transition-colors duration-300 cursor-pointer shrink-0 focus:outline-none"
                  style={{ background: withApp ? '#3b82f6' : '#555' }}
                  aria-label="Toggle Clipkatha"
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: withApp ? 'translateX(21px)' : 'translateX(2px)' }}
                  />
                </button>

                <span className="text-white text-xs font-semibold whitespace-nowrap select-none">With Clipkatha</span>

                <div className="w-px h-4 bg-white/25 mx-0.5" />

                {/* Pause / Play */}
                <button
                  onClick={() => setPaused(p => !p)}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label={paused ? 'Play' : 'Pause'}
                >
                  {paused ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  )}
                </button>

                {/* Mute / Unmute */}
                <button
                  onClick={() => setMuted(m => !m)}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Toggle to see the difference Clipkatha makes on a real recording
      </p>
    </div>
  )
}

export default Hero
