import { randomUUID } from 'node:crypto'
import * as os from 'node:os'
import * as pty from 'node-pty'
import type { AgentInfo } from './agent-types'

const MAX_OUTPUT = 250_000

type StartOptions = {
  cwd?: string
  command?: string
  sessionId?: string
}

class AgentManager {
  private readonly agents = new Map<
    string,
    { info: AgentInfo; terminal: pty.IPty; output: string; outputBase: number }
  >()

  list(): AgentInfo[] {
    return [...this.agents.values()].map(({ info }) => ({ ...info }))
  }

  start(options: StartOptions = {}): AgentInfo {
    const { cwd = process.cwd(), command = 'claude', sessionId } = options
    const id = randomUUID()
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
    const args = os.platform() === 'win32' ? ['-NoExit', '-Command', command] : ['-lc', command]
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
      ...(sessionId ? { sessionId } : {}),
    }

    const entry = { info, terminal, output: '', outputBase: 0 }
    terminal.onData((data) => {
      entry.output += data
      if (entry.output.length > MAX_OUTPUT) {
        const removed = entry.output.length - MAX_OUTPUT
        entry.output = entry.output.slice(removed)
        entry.outputBase += removed
      }
    })
    terminal.onExit(({ exitCode }) => {
      const current = this.agents.get(id)
      if (current) {
        current.info.status = exitCode === 0 ? 'stopped' : 'error'
        current.info.exitCode = exitCode
      }
    })

    this.agents.set(id, entry)
    return { ...info }
  }

  readOutput(id: string, offset = 0) {
    const entry = this.require(id)
    const absoluteEnd = entry.outputBase + entry.output.length
    const safeOffset = Math.max(entry.outputBase, Math.min(offset, absoluteEnd))
    const localOffset = safeOffset - entry.outputBase
    return { data: entry.output.slice(localOffset), nextOffset: absoluteEnd }
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

  private require(id: string) {
    const agent = this.agents.get(id)
    if (!agent) throw new Error(`Unknown agent: ${id}`)
    return agent
  }
}

export const agentManager = new AgentManager()
