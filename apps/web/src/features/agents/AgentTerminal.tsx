import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useMutation } from '@tanstack/react-query'
import { getAgentOutput, resizeAgent, writeAgent } from './agents.api'

interface AgentTerminalProps {
  agentId: string
  height?: number
}

export function AgentTerminal({ agentId, height = 420 }: AgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const offsetRef = useRef(0)
  const pendingInputRef = useRef('')
  const inputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const write = useMutation({ mutationFn: (input: string) => writeAgent({ data: { id: agentId, input } }) })
  const resize = useMutation({ mutationFn: (size: { cols: number; rows: number }) => resizeAgent({ data: { id: agentId, ...size } }) })

  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.15,
      scrollback: 5000,
      theme: {
        background: '#050505',
        foreground: '#e5e7eb',
        cursor: '#e5e7eb',
      },
    })
    terminal.open(containerRef.current)
    terminalRef.current = terminal

    const inputDisposable = terminal.onData((data) => {
      pendingInputRef.current += data
      if (inputTimerRef.current) return
      inputTimerRef.current = setTimeout(() => {
        const input = pendingInputRef.current
        pendingInputRef.current = ''
        inputTimerRef.current = null
        if (input) write.mutate(input)
      }, 25)
    })

    const poll = async () => {
      try {
        const result = await getAgentOutput({ data: { id: agentId, offset: offsetRef.current } })
        if (result.data) {
          terminal.write(result.data)
          offsetRef.current = result.nextOffset
        }
      } catch {
        // The process may have exited between polls.
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), 250)

    const observer = new ResizeObserver(() => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cols = Math.max(40, Math.floor(rect.width / 8))
      const rows = Math.max(8, Math.floor(height / 15))
      terminal.resize(cols, rows)
      resize.mutate({ cols, rows })
    })
    observer.observe(containerRef.current)

    return () => {
      clearInterval(timer)
      observer.disconnect()
      inputDisposable.dispose()
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current)
      terminal.dispose()
      terminalRef.current = null
    }
  }, [agentId, height])

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#050505]">
      <div className="flex h-9 items-center justify-between border-b border-gray-800 px-3 text-xs text-gray-500">
        <span className="font-mono">Terminal · live PTY · Ctrl+O output</span>
        <span>Interactive</span>
      </div>
      <div ref={containerRef} style={{ height }} className="p-2" />
    </div>
  )
}
