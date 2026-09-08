import { randomUUID } from 'node:crypto'
import * as os from 'node:os'
import * as pty from 'node-pty'
import type { AgentInfo, AgentStatus } from './agent-types'

class AgentManager {
  private readonly agents = new Map<string, { info: AgentInfo; terminal: pty.IPty }>()

  list(): AgentInfo[] {
    return [...this.agents.values()].map(({ info }) => ({ ...info }))
  }

  start(cwd = process.cwd(), command = 'claude'): AgentInfo {
    const id = randomUUID()
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
    const args = os.platform() === 'win32' ? [] : ['-lc', command]
    const terminal = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 32,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
    })

    const info: AgentInfo = {
      id,
      pid: terminal.pid,
      command,
      cwd,
      startedAt: new Date().toISOString(),
      status: 'running',
    }

    terminal.onExit(({ exitCode }) => {
      const current = this.agents.get(id)
      if (current) {
        current.info.status = exitCode === 0 ? 'stopped' : 'error'
        current.info.exitCode = exitCode
      }
    })

    this.agents.set(id, { info, terminal })
    return { ...info }
  }

  write(id: string, input: string) {
    this.require(id).terminal.write(input)
  }

  resize(id: string, cols: number, rows: number) {
    if (cols < 1 || rows < 1) throw new Error('Invalid terminal size')
    this.require(id).terminal.resize(cols, rows)
  }

  kill(id: string) {
    const agent = this.require(id)
    agent.terminal.kill()
    agent.info.status = 'stopped'
  }

  onData(id: string, listener: (data: string) => void) {
    return this.require(id).terminal.onData(listener)
  }

  private require(id: string) {
    const agent = this.agents.get(id)
    if (!agent) throw new Error(`Unknown agent: ${id}`)
    return agent
  }
}

export const agentManager = new AgentManager()
