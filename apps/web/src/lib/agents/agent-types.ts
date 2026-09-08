export type AgentStatus = 'starting' | 'running' | 'waiting' | 'stopped' | 'error'

export interface AgentInfo {
  id: string
  pid: number
  command: string
  cwd: string
  startedAt: string
  status: AgentStatus
  exitCode?: number
}
