import React, { useEffect, useState } from 'react'
import { Menu, X, LayoutDashboard, Sparkles, LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuth } from '../../contexts/AuthContext'

const Navbar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Account'

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollStart = 50
      const scrollEnd = 500
      const scrollY = window.scrollY
      if (scrollY < scrollStart) setScrollProgress(0)
      else if (scrollY > scrollEnd) setScrollProgress(1)
      else setScrollProgress((scrollY - scrollStart) / (scrollEnd - scrollStart))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const top = lerp(0, 16, scrollProgress)
  const width = lerp(100, 90, scrollProgress)
  const maxWidthPx = lerp(10000, 720, scrollProgress)
  const paddingY = lerp(24, 12, scrollProgress)
  const paddingX = lerp(32, 24, scrollProgress)
  const borderRadius = lerp(0, 9999, scrollProgress)
  const bgOpacity = lerp(0, 85, scrollProgress)
  const borderOpacity = lerp(0, 50, scrollProgress)
  const shadowOpacity = lerp(0, 10, scrollProgress)

  const btnSize = {
    paddingLeft: `${lerp(16, 12, scrollProgress)}px`,
    paddingRight: `${lerp(16, 12, scrollProgress)}px`,
    paddingTop: `${lerp(8, 6, scrollProgress)}px`,
    paddingBottom: `${lerp(8, 6, scrollProgress)}px`,
    fontSize: `${lerp(14, 12, scrollProgress)}px`,
  }

  const iconSize = {
    width: `${lerp(16, 12, scrollProgress)}px`,
    height: `${lerp(16, 12, scrollProgress)}px`,
  }

  return (
    <div className="w-full flex justify-center">
      <nav
        className="fixed z-50 transition-all duration-300 ease-out will-change-transform"
        style={{
          top: `${top}px`,
          width: `${width}%`,
          maxWidth: `${maxWidthPx}px`,
          paddingTop: `${paddingY}px`,
          paddingBottom: `${paddingY}px`,
          paddingLeft: `${paddingX}px`,
          paddingRight: `${paddingX}px`,
          borderRadius: `${borderRadius}px`,
          backgroundColor: `rgba(255,255,235,${bgOpacity / 100})`,
          backdropFilter: scrollProgress > 0 ? 'blur(12px)' : 'none',
          border: `1px solid rgba(229,231,235,${borderOpacity / 100})`,
          boxShadow: `0 20px 25px -5px rgba(0,0,0,${shadowOpacity / 100}),0 10px 10px -5px rgba(0,0,0,${shadowOpacity / 100})`,
        }}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div
              className="rounded-xl bg-brand-violet flex items-center justify-center transition-all duration-300"
              style={{ width: `${lerp(36, 28, scrollProgress)}px`, height: `${lerp(36, 28, scrollProgress)}px` }}
            >
              <Sparkles className="text-white" style={iconSize} />
            </div>
            <span
              className="font-bold tracking-tight text-gray-900 transition-all duration-300"
              style={{ fontSize: `${lerp(22, 17, scrollProgress)}px` }}
            >
              Clip<span className="text-brand-violet">katha</span>
            </span>
          </Link>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-white/60 backdrop-blur-md text-gray-700 font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-black/10 border border-gray-200/50 cursor-pointer hover:bg-white/80"
              style={btnSize}
            >
              <LayoutDashboard style={iconSize} />
              Dashboard
            </button>

            {user ? (
              <>
                {/* User chip */}
                <div
                  className="flex items-center gap-2 bg-white/60 backdrop-blur-md text-gray-700 font-medium rounded-xl border border-gray-200/50 shadow-lg shadow-black/5"
                  style={btnSize}
                >
                  <UserIcon style={iconSize} />
                  <span style={{ fontSize: `${lerp(14, 12, scrollProgress)}px` }}>{displayName}</span>
                </div>
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-gray-900 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-black/10 hover:bg-black border border-white/10 cursor-pointer"
                  style={btnSize}
                >
                  <LogOut style={iconSize} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 bg-white/60 backdrop-blur-md text-gray-700 font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-black/10 border border-gray-200/50 cursor-pointer hover:bg-white/80"
                  style={btnSize}
                >
                  <LogIn style={iconSize} />
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="relative overflow-hidden group bg-brand-light text-[#3d1f66] font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#c49ef5]/30 hover:shadow-[#c49ef5]/50 cursor-pointer"
                  style={btnSize}
                >
                  <span className="relative z-10">Polish a Video</span>
                  <div className="absolute inset-0 bg-[#3d1f66]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="text-gray-600 hover:text-black">
                  <Menu />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed z-50 right-0 top-0 bottom-0 w-3/4 max-w-xs bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 border-l border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                    <span className="font-bold text-xl text-gray-900">Menu</span>
                    <Dialog.Close asChild>
                      <button className="text-gray-500 hover:text-black p-2 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Dialog.Close asChild>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                      </button>
                    </Dialog.Close>

                    {user ? (
                      <>
                        <div className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center justify-center gap-2 font-medium">
                          <UserIcon className="w-5 h-5" />
                          {displayName}
                        </div>
                        <Dialog.Close asChild>
                          <button
                            onClick={handleLogout}
                            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                          >
                            <LogOut className="w-5 h-5" />
                            Logout
                          </button>
                        </Dialog.Close>
                      </>
                    ) : (
                      <>
                        <Dialog.Close asChild>
                          <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <LogIn className="w-5 h-5" />
                            Login
                          </button>
                        </Dialog.Close>
                        <Dialog.Close asChild>
                          <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-brand-light text-[#3d1f66] font-bold rounded-xl cursor-pointer"
                          >
                            Polish a Video
                          </button>
                        </Dialog.Close>
                      </>
                    )}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </nav>
    </div>
  )
}

export default Navbar
