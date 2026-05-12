import React from 'react'

const USE_CASES = [
  {
    id: 'sales',
    title: 'Clipkatha for Sales',
    desc: 'Send polished video pitches to prospects without twelve takes',
    bg: '#dde4fb',
    illu: <SalesIllu />,
  },
  {
    id: 'product',
    title: 'Clipkatha for Product',
    desc: 'Walk through new features and share updates your team actually watches',
    bg: '#f5e6d0',
    illu: <ProductIllu />,
  },
  {
    id: 'support',
    title: 'Clipkatha for Support',
    desc: 'Build onboarding guides and training videos without a production team',
    bg: '#eddaf7',
    illu: <SupportIllu />,
  },
  {
    id: 'creators',
    title: 'Clipkatha for Creators',
    desc: 'Turn raw screen recordings into content your audience actually shares',
    bg: '#fbd8d0',
    illu: <CreatorsIllu />,
  },
  {
    id: 'marketing',
    title: 'Clipkatha for Marketing',
    desc: 'Produce campaign videos and announcements at scale without a studio',
    bg: '#f7d0f2',
    illu: <MarketingIllu />,
  },
  {
    id: 'educators',
    title: 'Clipkatha for Educators',
    desc: 'Create crisp course videos that students actually finish watching',
    bg: '#d8f7d0',
    illu: <EducatorsIllu />,
  },
]

function BrowserChrome({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-black/[0.06]" style={{ background: bg }}>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white/60">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-yellow-400" />
        <div className="w-2 h-2 rounded-full bg-green-400" />
      </div>
      <div className="px-4 pt-2 pb-4">{children}</div>
    </div>
  )
}

function UseCaseCard({ title, desc, bg, illu }: Omit<typeof USE_CASES[0], 'id'>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative" style={{ background: bg, borderRadius: '1.25rem', padding: '1.25rem' }}>
        <BrowserChrome bg="white">
          {illu}
        </BrowserChrome>
      </div>
      <div>
        <p className="font-bold text-gray-900 text-base">{title}</p>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function SalesIllu() {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">Q3 Pipeline Review</p>
        <p className="text-lg font-black text-gray-900 leading-tight">Market<br />Trends</p>
      </div>
      <svg viewBox="0 0 160 52" className="w-full h-12">
        <polyline
          points="0,48 30,38 55,42 80,24 108,28 135,10 160,14"
          fill="none" stroke="#4caf7d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="135" cy="10" r="3" fill="#4caf7d" />
      </svg>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <p className="text-[10px] text-gray-400">+18% MoM · Updated today</p>
      </div>
    </div>
  )
}

function ProductIllu() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <div className="px-2 py-0.5 rounded bg-[#5b7ffa] text-white text-[9px] font-semibold">Features</div>
        <div className="px-2 py-0.5 rounded bg-gray-100 text-gray-400 text-[9px]">Changelog</div>
        <div className="px-2 py-0.5 rounded bg-gray-100 text-gray-400 text-[9px]">Roadmap</div>
      </div>
      <div className="space-y-2">
        {[
          { label: 'Dark mode support', w: 90, active: true },
          { label: 'Export to PDF', w: 70, active: false },
          { label: 'Team permissions', w: 80, active: true },
          { label: 'API webhooks', w: 55, active: false },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.active ? 'bg-[#5b7ffa]' : 'bg-gray-300'}`} />
            <p className="text-[10px] text-gray-600 flex-1">{row.label}</p>
            <div className="h-1.5 rounded-full bg-gray-100 w-16">
              <div className="h-full rounded-full bg-[#5b7ffa]/40" style={{ width: `${row.w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SupportIllu() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Help Center</p>
        <div className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 text-[9px] font-medium">Live</div>
      </div>
      <div className="rounded-lg overflow-hidden border border-purple-100">
        <div className="bg-[#7c3aed] px-3 py-2">
          <p className="text-white text-[10px] font-semibold">Getting started with the dashboard</p>
          <p className="text-purple-200 text-[9px] mt-0.5">3 min video guide</p>
        </div>
        <div className="bg-gray-900 h-10 flex items-center justify-center relative">
          <div className="w-5 h-5 rounded-full border border-white/30 bg-white/10 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5" />
          </div>
          <div className="absolute bottom-1.5 left-2 right-2 h-0.5 bg-white/20 rounded-full">
            <div className="h-full w-1/3 bg-[#a78bfa] rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {['Setup', 'Billing', 'Integrations'].map(t => (
          <div key={t} className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-[9px] text-purple-600">{t}</div>
        ))}
      </div>
    </div>
  )
}

function CreatorsIllu() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-700">my-product-demo.mp4</p>
        <div className="px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-[9px] text-red-500 font-medium">Raw</div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
          <p className="text-[10px] text-gray-500 line-through">So um, basically this is how you, uh, use it…</p>
        </div>
        <div className="flex items-start gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1 shrink-0" />
          <p className="text-[10px] text-gray-700 font-medium">Here's how you use it in three steps.</p>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <div className="px-2 py-1 rounded-lg bg-[#e85c3a] text-white text-[9px] font-bold">Publish</div>
        <div className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-[9px]">Schedule</div>
        <div className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-[9px]">Export SRT</div>
      </div>
    </div>
  )
}

function MarketingIllu() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-700">Social media</p>
          <p className="text-[10px] font-semibold text-gray-700">post frequency</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-gray-900">↑ 34%</p>
          <p className="text-[9px] text-gray-400">vs last month</p>
        </div>
      </div>
      <div className="flex gap-1 items-end h-12">
        {[30, 50, 28, 72, 45, 80, 38, 90, 55, 68].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h}%`, background: i >= 7 ? '#d63aad' : '#f0a8e8' }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#d63aad]" /><p className="text-[9px] text-gray-400">This month</p></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#f0a8e8]" /><p className="text-[9px] text-gray-400">Last month</p></div>
      </div>
    </div>
  )
}

function EducatorsIllu() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-gray-600">Intro to Product Design</p>
        <p className="text-[9px] text-gray-400">Lesson 4 / 12</p>
      </div>
      <div className="bg-gray-900 rounded-lg h-16 flex items-center justify-center relative overflow-hidden">
        <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
        </div>
        <div className="absolute bottom-2 left-2 right-2 h-0.5 bg-white/20 rounded-full">
          <div className="h-full w-2/5 bg-green-400 rounded-full" />
        </div>
        <p className="absolute bottom-4 right-2 text-[8px] text-white/50">3:42 / 8:15</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex -space-x-1">
          {['#86efac','#6ee7b7','#34d399'].map((c,i) => (
            <div key={i} className="w-4 h-4 rounded-full border border-white" style={{ background: c }} />
          ))}
        </div>
        <p className="text-[9px] text-gray-400">847 students watching</p>
      </div>
    </div>
  )
}

const UseCasesSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#ffffeb]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#e8e4c8] bg-[#f7f5dc] text-sm text-[#1a1a1a] font-medium mb-6">
            Clipkatha is for everyone
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-4">
            Share anything as
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet to-brand-indigo">
              video messages
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light">
            Clipkatha takes raw recordings and makes them awesome with AI
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {USE_CASES.map(({ id, ...rest }) => (
            <UseCaseCard key={id} {...rest} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default UseCasesSection
