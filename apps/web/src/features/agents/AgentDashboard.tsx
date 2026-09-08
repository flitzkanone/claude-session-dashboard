import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAgents, startAgent, stopAgent } from './agents.api'

export function AgentDashboard() {
  const queryClient = useQueryClient()
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
    refetchInterval: 1000,
  })

  const start = useMutation({
    mutationFn: () => startAgent({ data: { cwd: undefined, command: 'claude' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  const stop = useMutation({
    mutationFn: (id: string) => stopAgent({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Agents</h1>
          <p className="mt-1 text-sm text-gray-400">Running Claude Code processes</p>
        </div>
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          + New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-8 text-center text-sm text-gray-400">
          No agents are currently managed by the dashboard.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${agent.status === 'running' ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <span className="font-medium text-gray-100">Claude Agent</span>
                </div>
                <span className="text-xs uppercase tracking-wide text-gray-500">{agent.status}</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">PID</dt><dd className="font-mono text-gray-300">{agent.pid}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Directory</dt><dd className="max-w-[70%] truncate font-mono text-gray-300" title={agent.cwd}>{agent.cwd}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Started</dt><dd className="text-gray-300">{new Date(agent.startedAt).toLocaleTimeString()}</dd></div>
              </dl>
              {agent.status === 'running' && (
                <button
                  type="button"
                  onClick={() => stop.mutate(agent.id)}
                  className="mt-5 rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900"
                >
                  Stop
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
