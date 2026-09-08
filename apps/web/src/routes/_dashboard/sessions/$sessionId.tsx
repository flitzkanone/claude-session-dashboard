import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { sessionDetailQuery } from '@/features/session-detail/session-detail.queries'
import { TimelineEventsChart } from '@/features/session-detail/timeline-chart'
import { ContextWindowPanel } from '@/features/session-detail/ContextWindowPanel'
import { ToolUsagePanel } from '@/features/session-detail/ToolUsagePanel'
import { ErrorPanel } from '@/features/session-detail/ErrorPanel'
import { AgentDispatchesPanel, SkillInvocationsPanel } from '@/features/session-detail/AgentsSkillsPanel'
import { TasksPanel } from '@/features/session-detail/TasksPanel'
import { CostEstimationPanel } from '@/features/cost-estimation/CostEstimationPanel'
import { CostSummaryLine } from '@/features/cost-estimation/CostSummaryLine'
import { ActiveSessionBanner } from '@/features/session-detail/ActiveSessionBanner'
import { useIsSessionActive } from '@/features/sessions/useIsSessionActive'
import { formatDuration, formatDateTime } from '@/lib/utils/format'
import { sessionToJSON, downloadFile } from '@/lib/utils/export-utils'
import { ExportDropdown } from '@/components/ExportDropdown'
import { SessionIdDisplay } from '@/features/session-detail/SessionIdDisplay'
import { usePrivacy } from '@/features/privacy/PrivacyContext'
import { getAgents, startAgent, stopAgent } from '@/features/agents/agents.api'
import { AgentTerminal } from '@/features/agents/AgentTerminal'
import { z } from 'zod'

const searchSchema = z.object({
  project: z.string().optional(),
})

export const Route = createFileRoute('/_dashboard/sessions/$sessionId')({
  validateSearch: searchSchema,
  component: SessionDetailPage,
})

function SessionDetailPage() {
  const { sessionId } = Route.useParams()
  const { project = '' } = Route.useSearch()
  const [terminalAgentId, setTerminalAgentId] = useState<string | null>(null)

  const { privacyMode, anonymizeProjectName, anonymizeBranch } = usePrivacy()
  const isActive = useIsSessionActive(sessionId)

  const { data: detail, isLoading, error } = useQuery(
    sessionDetailQuery(sessionId, project, isActive),
  )
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
    refetchInterval: 1000,
  })

  useEffect(() => {
    const existing = agents.find((agent) => agent.sessionId === sessionId && agent.status === 'running')
    if (existing) setTerminalAgentId(existing.id)
  }, [agents, sessionId])

  const startTerminal = useMutation({
    mutationFn: () =>
      startAgent({
        data: {
          cwd: project || undefined,
          command: `claude --resume ${sessionId}`,
          sessionId,
        },
      }),
    onSuccess: (agent) => setTerminalAgentId(agent.id),
  })

  const stopTerminal = useMutation({
    mutationFn: () => {
      if (!terminalAgentId) throw new Error('No terminal agent')
      return stopAgent({ data: { id: terminalAgentId } })
    },
    onSuccess: () => setTerminalAgentId(null),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-800" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-900/50" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-400">
          Failed to load session: {error?.message ?? 'Not found'}
        </p>
        <Link
          to="/sessions"
          className="mt-2 inline-block text-sm text-brand-300 hover:underline"
        >
          Back to sessions
        </Link>
      </div>
    )
  }

  const startedAt = detail.turns[0]?.timestamp
  const endedAt = detail.turns[detail.turns.length - 1]?.timestamp
  const durationMs =
    startedAt && endedAt
      ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
      : 0

  return (
    <div>
      {isActive && <ActiveSessionBanner />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/sessions"
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            &larr; Sessions
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-100">
            {privacyMode
              ? anonymizeProjectName(detail.projectName)
              : detail.projectName}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
            {detail.branch && (
              <span className="font-mono">{anonymizeBranch(detail.branch)}</span>
            )}
            {startedAt && <span>{formatDateTime(startedAt)}</span>}
            <span>{formatDuration(durationMs)}</span>
            <span>{detail.turns.length} turns</span>
            <CostSummaryLine tokensByModel={detail.tokensByModel} />
          </div>
          {detail.models.length > 0 && (
            <div className="mt-1 flex gap-1">
              {detail.models.map((m) => (
                <span
                  key={m}
                  className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400"
                >
                  {m.replace(/^claude-/, '').split('-202')[0]}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1">
            <SessionIdDisplay sessionId={sessionId} interactive={detail.isInteractive} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportDropdown
            options={[
              {
                label: 'Export Session (JSON)',
                onClick: () =>
                  downloadFile(
                    sessionToJSON(detail),
                    `session-${sessionId.slice(0, 8)}.json`,
                    'application/json',
                  ),
              },
            ]}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ContextWindowPanel contextWindow={detail.contextWindow} tokens={detail.totalTokens} />
        <ToolUsagePanel toolFrequency={detail.toolFrequency} />
      </div>

      {/* Cost estimation */}
      <div className="mt-4">
        <CostEstimationPanel tokensByModel={detail.tokensByModel} />
      </div>

      {/* Agent Dispatches */}
      {detail.agents.length > 0 && (
        <div className="mt-4">
          <AgentDispatchesPanel agents={detail.agents} />
        </div>
      )}

      {/* Tasks */}
      {detail.tasks.length > 0 && (
        <div className="mt-4">
          <TasksPanel tasks={detail.tasks} />
        </div>
      )}

      <div className="mt-4">
        <ErrorPanel errors={detail.errors} />
      </div>

      {/* Live Claude terminal */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-300">Live terminal</h2>
            <p className="mt-1 text-xs text-gray-500">
              Interactive Claude Code PTY with the same session context. Ctrl+O output is shown live.
            </p>
          </div>
          {terminalAgentId ? (
            <button
              type="button"
              onClick={() => stopTerminal.mutate()}
              disabled={stopTerminal.isPending}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900 disabled:opacity-50"
            >
              Stop terminal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTerminal.mutate()}
              disabled={startTerminal.isPending}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {startTerminal.isPending ? 'Starting…' : 'Open terminal'}
            </button>
          )}
        </div>

        {terminalAgentId ? (
          <AgentTerminal agentId={terminalAgentId} height={460} />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-800 bg-gray-950/50 px-5 py-10 text-center text-xs text-gray-500">
            Open the terminal to resume this Claude session interactively.
          </div>
        )}
      </div>

      {/* Timeline Events Chart */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">Timeline</h2>
        <TimelineEventsChart
          turns={detail.turns}
          agents={detail.agents}
          skills={detail.skills}
          errors={detail.errors}
        />
      </div>

      {/* Skill Invocations */}
      {(detail.skills.length > 0 || detail.agents.some(a => (a.skills?.length ?? 0) > 0)) && (
        <div className="mt-6">
          <SkillInvocationsPanel agents={detail.agents} skills={detail.skills} />
        </div>
      )}

    </div>
  )
}
