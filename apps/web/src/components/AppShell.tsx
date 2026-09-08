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
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-800 bg-gray-950">
        <div className="flex h-14 items-center border-b border-gray-800 px-4">
          <Link to="/agents" className="text-sm font-bold text-gray-100">
            <span className="text-brand-500">Claude</span> Command Center
          </Link>
        </div>
        <nav className="flex-1 p-3">
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
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
