import React from 'react'
import { Sparkles } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#f5f2d8] border-t border-[#e8e4c8] py-8">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-violet flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="text-gray-500 text-xs font-medium">© 2025 Clipkatha</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
