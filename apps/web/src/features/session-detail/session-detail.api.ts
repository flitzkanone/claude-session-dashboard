import * as fs from 'node:fs'
import * as readline from 'node:readline'
import { createServerFn } from '@tanstack/react-start'
import { extractProjectName } from '@/lib/utils/claude-path'
import { parseDetail } from '@/lib/parsers/session-parser'
import type { RawJsonlMessage } from '@/lib/parsers/types'
import { findSessionFile } from './find-session-file'

export const getSessionDetail = createServerFn({ method: 'GET' })
  .inputValidator((input: { sessionId: string; projectPath: string }) => input)
  .handler(async ({ data }) => {
    const filePath = await findSessionFile(data.sessionId, data.projectPath)
    if (!filePath) {
      throw new Error(`Session not found: ${data.sessionId}`)
    }

    const projectName = extractProjectName(data.projectPath)
    return parseDetail(filePath.path, data.sessionId, data.projectPath, projectName)
  })

type VerboseEntry = {
  timestamp: string
  kind: 'You' | 'Claude' | 'Tool' | 'Tool result' | 'Progress' | 'System'
  text: string
}

const MAX_ENTRIES = 500
const MAX_TEXT_LENGTH = 8000

function truncate(text: string) {
  if (text.length <= MAX_TEXT_LENGTH) return text
  return `${text.slice(0, MAX_TEXT_LENGTH)}\n… [truncated]`
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      const item = block as { type?: string; text?: string; content?: unknown }
      if (item.type === 'text' && item.text) return item.text
      if (item.type === 'tool_result') return contentText(item.content)
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function toolInputText(input: unknown) {
  if (input === undefined) return ''
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

function entriesFromMessage(msg: RawJsonlMessage): VerboseEntry[] {
  const timestamp = msg.timestamp ?? ''
  const entries: VerboseEntry[] = []
  const content = msg.message?.content ?? []

  if (msg.type === 'user') {
    const text = contentText(content)
    if (text) entries.push({ timestamp, kind: 'You', text: truncate(text) })

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type !== 'tool_result') continue
        const result = contentText(block.content)
        if (result) {
          entries.push({ timestamp, kind: 'Tool result', text: truncate(result) })
        }
      }
    }
  }

  if (msg.type === 'assistant') {
    const text = contentText(content)
    if (text) entries.push({ timestamp, kind: 'Claude', text: truncate(text) })

    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type !== 'tool_use' || !block.name) continue
        const input = toolInputText(block.input)
        const text = input ? `${block.name}\n${input}` : block.name
        entries.push({ timestamp, kind: 'Tool', text: truncate(text) })
      }
    }
  }

  if (msg.type === 'progress') {
    const progressContent = msg.data?.message?.message?.content
    const text = contentText(progressContent)
    if (text) entries.push({ timestamp, kind: 'Progress', text: truncate(text) })
  }

  if (msg.type === 'system') {
    const text = contentText(content)
    if (text) entries.push({ timestamp, kind: 'System', text: truncate(text) })
  }

  return entries
}

export const getSessionVerboseOutput = createServerFn({ method: 'GET' })
  .inputValidator((input: { sessionId: string; projectPath: string }) => input)
  .handler(async ({ data }) => {
    const filePath = await findSessionFile(data.sessionId, data.projectPath)
    if (!filePath) {
      throw new Error(`Session not found: ${data.sessionId}`)
    }

    const entries: VerboseEntry[] = []
    const stream = fs.createReadStream(filePath.path, { encoding: 'utf-8' })
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

    for await (const line of rl) {
      if (!line.trim()) continue
      let parsed: RawJsonlMessage
      try {
        parsed = JSON.parse(line) as RawJsonlMessage
      } catch {
        continue
      }

      for (const entry of entriesFromMessage(parsed)) {
        entries.push(entry)
        if (entries.length > MAX_ENTRIES) entries.shift()
      }
    }

    return { entries }
  })
