import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { agentManager } from '@/lib/agents/agent-manager'

const startSchema = z.object({
  cwd: z.string().optional(),
  command: z.string().min(1).default('claude'),
  sessionId: z.string().uuid().optional(),
})

export const getAgents = createServerFn({ method: 'GET' }).handler(() => agentManager.list())

export const startAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(({ data }) => agentManager.start(data))

export const stopAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(({ data }) => {
    agentManager.kill(data.id)
    return agentManager.list().find((agent) => agent.id === data.id)
  })

export const writeAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), input: z.string() }).parse(input))
  .handler(({ data }) => {
    agentManager.write(data.id, data.input)
    return { ok: true }
  })

export const getAgentOutput = createServerFn({ method: 'GET' })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), offset: z.number().int().nonnegative().default(0) }).parse(input))
  .handler(({ data }) => agentManager.readOutput(data.id, data.offset))

export const resizeAgent = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), cols: z.number().int().positive(), rows: z.number().int().positive() }).parse(input))
  .handler(({ data }) => {
    agentManager.resize(data.id, data.cols, data.rows)
    return { ok: true }
  })
