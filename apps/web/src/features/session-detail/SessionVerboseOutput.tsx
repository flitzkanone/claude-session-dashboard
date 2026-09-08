import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getSessionVerboseOutput } from './session-detail.api'

interface SessionVerboseOutputProps {
  sessionId: string
  projectPath: string
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString()
}

function ActivityMarkdown({ text }: { text: string }) {
  return (
    <div className="min-w-0 flex-1 text-gray-300 [&_a]:text-brand-300 [&_a]:underline [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-700 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-gray-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-gray-200 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_ol]:my-1 [&_p]:mb-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:[&_code]:bg-transparent [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-800 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-gray-800 [&_th]:bg-gray-900 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_tr:nth-child(even)]:bg-gray-950/50 [&_ul]:my-1 [&_hr]:my-3 [&_hr]:border-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}

export function SessionVerboseOutput({
  sessionId,
  projectPath,
}: SessionVerboseOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['session', 'verbose-output', sessionId, projectPath],
    queryFn: () => getSessionVerboseOutput({ data: { sessionId, projectPath } }),
    refetchInterval: 1000,
    staleTime: 500,
  })

  useEffect(() => {
    const container = scrollRef.current
    if (!container || !data?.entries.length) return

    container.scrollTop = container.scrollHeight
  }, [data?.entries.length])

  return (
    <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">Claude activity</h2>
          <p className="mt-1 text-xs text-gray-500">
            Live verbose session output from the Claude Code JSONL log.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-gray-600">
          Live · 1s
        </span>
      </div>

      <div ref={scrollRef} className="max-h-[560px] overflow-y-auto p-3 font-mono text-xs">
        {isLoading && (
          <div className="px-2 py-8 text-center text-gray-600">Loading activity…</div>
        )}

        {error && (
          <div className="px-2 py-8 text-center text-red-400">
            Failed to load activity: {error.message}
          </div>
        )}

        {!isLoading && !error && data?.entries.length === 0 && (
          <div className="px-2 py-8 text-center text-gray-600">
            No verbose output available yet.
          </div>
        )}

        <div className="space-y-1">
          {data?.entries.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="rounded-md px-2 py-1.5 hover:bg-gray-900"
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-700">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="shrink-0 pt-0.5 text-gray-500">{entry.kind}</span>
                <ActivityMarkdown text={entry.text} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
