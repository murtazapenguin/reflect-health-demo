import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  PhoneIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'

const DEMO_PHONE = '+1 (415) 909-5732'

const Layout = ({ user, onLogout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
    { id: 'calls', name: 'Call Log', icon: PhoneIcon, path: '/calls' },
    { id: 'five9', name: 'Five9 Integration', icon: CloudIcon, path: '/five9' },
  ]

  const isActive = (path) => location.pathname === path || (path === '/calls' && location.pathname.startsWith('/calls/'))

  return (
    <div className="min-h-screen bg-background flex">
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} sidebar-glass transition-all duration-300 flex flex-col h-screen sticky top-0`}>
        <div className="p-4 border-b border-border flex items-center">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
            {sidebarCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
          </button>
          {!sidebarCollapsed && (
            <div className="ml-2">
              <img src="/reflect-health-logo.png" alt="Reflect Health" className="h-7 object-contain" />
            </div>
          )}
        </div>

        <nav className="mt-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 text-left transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary/8 text-primary border-r-3 border-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                title={sidebarCollapsed ? item.name : ''}>
                <Icon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!sidebarCollapsed && <span className="font-medium text-sm">{item.name}</span>}
              </button>
            )
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="px-4 py-3">
            <div className="bg-secondary rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <PhoneIcon className="w-4 h-4 text-primary" />
                <span className="type-micro uppercase tracking-[0.15em] text-muted-foreground">Demo Line</span>
              </div>
              <p className="text-sm font-bold text-foreground tracking-wide">{DEMO_PHONE}</p>
              <p className="type-micro text-muted-foreground mt-1">Call to test the AI agent</p>
            </div>
          </div>
        )}

        <div className="flex-1"></div>

        <div className={`p-3 border-t border-border ${sidebarCollapsed ? 'px-2' : ''}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center justify-center gap-2 mb-3 opacity-60">
              <img src="/penguin-icon.png" alt="PenguinAI" className="w-4 h-4" />
              <span className="type-micro text-muted-foreground">Powered by PenguinAI</span>
            </div>
          )}
          <button onClick={onLogout}
            className="w-full flex items-center px-3 py-2.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
            title={sidebarCollapsed ? 'Logout' : ''}>
            <ArrowRightOnRectangleIcon className={`w-5 h-5 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card/90 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-xl font-bold text-foreground">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/calls' && 'Call Log'}
              {location.pathname.startsWith('/calls/') && location.pathname !== '/calls' && 'Call Detail'}
              {location.pathname === '/five9' && 'Five9 Integration'}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded reflect-gradient text-white">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                AI Agent Live
              </div>
              <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors bg-card rounded-lg hover:bg-primary/5 border border-border">
                <BellIcon className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 reflect-gradient rounded-full"></span>
              </button>
              <div className="flex items-center bg-card rounded-xl px-3 py-1.5 border border-border">
                <div className="w-8 h-8 reflect-gradient rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{user?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}</span>
                </div>
                <div className="ml-2">
                  <span className="text-sm font-medium text-foreground">{user?.display_name || 'User'}</span>
                  <p className="type-micro text-muted-foreground">{user?.roles?.[0] || 'admin'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
