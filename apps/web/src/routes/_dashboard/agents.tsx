import { createFileRoute } from '@tanstack/react-router'
import { AgentDashboard } from '@/features/agents/AgentDashboard'

export const Route = createFileRoute('/_dashboard/agents')({
  component: AgentsPage,
})

function AgentsPage() {
  return <AgentDashboard />
}
