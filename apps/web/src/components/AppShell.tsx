import { Link, useMatches } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ActiveSessionsBadge } from '@/features/sessions/ActiveSessionsBadge'
import { appInfoQuery } from '@/features/settings/app-info.queries'

const NAV_ITEMS = [
  { to: '/agents', label: 'Agents', icon: '●' },
  { to: '/sessions', label: 'Sessions', icon: '≡' },
  { to: '/stats', label: 'Stats', icon: '▥' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname ?? ''
  const { data: appInfo } = useQuery(appInfoQuery)

  return (
    <div className="min-h-screen bg-gray-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-gray-800 bg-gray-950 md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-gray-800 px-4">
          <Link to="/agents" className="text-sm font-bold text-gray-100">
            <span className="text-brand-500">Claude</span> Command Center
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to} className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}>
                <span className="w-4 text-center text-gray-500">{item.icon}</span>
                {item.label}
                {item.to === '/sessions' && <ActiveSessionsBadge />}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Local only</span>
            {appInfo && <span>v{appInfo.version}</span>}
          </div>
        </div>
      </aside>

      <main className="min-h-screen md:ml-56">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-gray-800/80 bg-gray-950/95 px-4 backdrop-blur md:hidden">
          <Link to="/agents" className="text-sm font-bold text-gray-100">
            <span className="text-brand-500">Claude</span> Command Center
          </Link>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 sm:px-5 sm:py-6 md:px-6 md:pb-6">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-800 bg-gray-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to} className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${isActive ? 'text-brand-400' : 'text-gray-500'}`}>
                <span className="text-base leading-5">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.to === '/sessions' && <ActiveSessionsBadge />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
