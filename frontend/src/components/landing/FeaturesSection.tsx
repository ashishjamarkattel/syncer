import React, { useState, useEffect } from 'react'
import { UploadCloud, Cpu, CheckCircle } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'

const durations: Record<string, number> = {
  '0': 5000,
  '1': 6000,
  '2': 5000,
}

const steps = [
  {
    value: '0',
    title: 'Upload',
    desc: 'Drop any video file. Choose a voice. One click to start.',
    icon: <UploadCloud className="w-5 h-5" />,
    visual: <UploadPanel />,
  },
  {
    value: '1',
    title: 'AI Processing',
    desc: 'Five-stage pipeline runs automatically in the background.',
    icon: <Cpu className="w-5 h-5" />,
    visual: <PipelinePanel />,
  },
  {
    value: '2',
    title: 'Done',
    desc: 'Polished mp4 is ready to download, share, or publish.',
    icon: <CheckCircle className="w-5 h-5" />,
    visual: <OutputPanel />,
  },
]

const FeaturesSection: React.FC = () => {
  const [active, setActive] = useState('0')

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => ((parseInt(prev) + 1) % 3).toString())
    }, durations[active])
    return () => clearInterval(id)
  }, [active])

  return (
    <section id="demo" className="pt-0 pb-24 relative overflow-visible">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 text-gray-900 leading-tight">
            From Raw to Ready.{' '}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet/60 to-brand-indigo">
              In Minutes.
            </span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Clipkatha runs a fully automated AI pipeline—no editing skills required.
          </p>
        </div>

        <Tabs.Root
          value={active}
          onValueChange={setActive}
          orientation="vertical"
          className="grid md:grid-cols-12 gap-8 items-center"
        >
          <Tabs.List className="md:col-span-4 flex flex-col gap-3">
            {steps.map((step, idx) => (
              <Tabs.Trigger
                key={step.value}
                value={step.value}
                className={`text-left p-8 rounded-2xl transition-all duration-500 outline-none relative overflow-hidden cursor-pointer ${
                  active === step.value
                    ? 'bg-gradient-to-br from-brand-light/60 via-brand-light/20 to-transparent shadow-xl'
                    : 'bg-white/50 hover:bg-white/80 hover:shadow-md'
                }`}
              >
                <div
                  className={`absolute -top-4 -right-4 text-[120px] font-black leading-none transition-all duration-500 ${
                    active === step.value ? 'text-brand-violet/8 scale-100' : 'text-gray-200/50 scale-90'
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="relative z-10">
                  <div
                    className={`text-xs font-mono tracking-wider mb-3 transition-all duration-300 ${
                      active === step.value ? 'text-brand-violet' : 'text-gray-400'
                    }`}
                  >
                    STEP {idx + 1}
                  </div>
                  <h3
                    className={`text-2xl font-bold mb-3 transition-all duration-300 ${
                      active === step.value ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed transition-all duration-300 ${
                      active === step.value ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {step.desc}
                  </p>

                  {active === step.value && (
                    <div className="w-full h-1 bg-gray-100 mt-6 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-violet/30 via-brand-violet/60 to-brand-violet/30"
                        style={{
                          width: '100%',
                          animation: `widthBar ${durations[step.value]}ms linear`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="md:col-span-8">
            {steps.map((step) => (
              <Tabs.Content
                key={step.value}
                value={step.value}
                className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-2xl bg-white aspect-video">
                  {/* macOS chrome */}
                  <div className="absolute top-4 left-4 flex gap-2 z-10">
                    <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm" />
                  </div>
                  <div className="w-full h-full">{step.visual}</div>
                </div>
              </Tabs.Content>
            ))}
          </div>
        </Tabs.Root>
      </div>
    </section>
  )
}

function UploadPanel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-[#f7f5dc] pt-8">
      <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-brand-violet/40 bg-white flex flex-col items-center justify-center gap-2 shadow-inner">
        <UploadCloud className="w-12 h-12 text-brand-violet/60" />
        <span className="text-xs text-gray-400">Drop video</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-500 shadow-sm">
          Voice: nova ▾
        </div>
        <div className="px-6 py-2 rounded-xl bg-brand-light text-[#3d1f66] text-sm font-bold shadow-lg shadow-[#c49ef5]/25">
          Polish Video →
        </div>
      </div>
    </div>
  )
}

const PIPELINE = [
  { label: 'Transcribing', done: true },
  { label: 'Cleaning', done: true, active: true },
  { label: 'Generating Audio', done: false },
  { label: 'Syncing', done: false },
  { label: 'Rendering', done: false },
]

function PipelinePanel() {
  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 px-16 py-12 bg-[#f7f5dc] pt-10">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Pipeline · interview-take-3.mp4</p>
      {PIPELINE.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              s.done && !s.active
                ? 'bg-green-500'
                : s.active
                  ? 'bg-brand-violet animate-pulse'
                  : 'bg-gray-200'
            }`}
          >
            {s.done && !s.active && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {s.active && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span
            className={`text-sm font-medium ${
              s.active ? 'text-brand-violet' : s.done ? 'text-gray-500 line-through' : 'text-gray-300'
            }`}
          >
            {s.label}
          </span>
          {s.active && (
            <span className="text-xs text-brand-violet/60 ml-auto font-mono animate-pulse">running…</span>
          )}
        </div>
      ))}
    </div>
  )
}

function OutputPanel() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-[#f7f5dc] pt-8">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
        <svg className="w-12 h-12 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800">polished_interview-take-3.mp4</p>
        <p className="text-sm text-gray-400 mt-1">Completed in 1m 43s · 247 filler words removed</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 bg-white shadow-sm cursor-pointer hover:bg-gray-50">
          View Segments
        </div>
        <div className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg shadow-green-500/25 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </div>
      </div>
    </div>
  )
}

export default FeaturesSection
