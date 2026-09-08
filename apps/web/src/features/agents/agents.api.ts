import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const agentSchema = z.object({
  name: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().trim().max(500),
  model: z.string().trim().min(1).max(80),
  instructions: z.string().max(50000),
})

function agentsDir() {
  return path.join(process.env.HOME || process.cwd(), '.claude', 'agents')
}

async function listDefinitions() {
  const dir = agentsDir()
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.md')).sort()
    return Promise.all(files.map(async (file) => {
      const content = await readFile(path.join(dir, file), 'utf8')
      const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
      const frontmatter = match?.[1] || ''
      const instructions = match?.[2]?.trim() || content.trim()
      const value = (key: string) => frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() || ''
      return { name: path.basename(file, '.md'), description: value('description'), model: value('model'), instructions, filename: file }
    }))
  } catch {
    return []
  }
}

export const getAgentDefinitions = createServerFn({ method: 'GET' }).handler(() => listDefinitions())

export const saveAgentDefinition = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => agentSchema.parse(input))
  .handler(async ({ data }) => {
    const dir = agentsDir()
    await mkdir(dir, { recursive: true })
    const content = `---\nname: ${data.name}\ndescription: ${data.description}\nmodel: ${data.model}\n---\n\n${data.instructions.trim()}\n`
    await writeFile(path.join(dir, `${data.name}.md`), content, 'utf8')
    return { ok: true }
  })

export const deleteAgentDefinition = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ name: z.string().regex(/^[a-zA-Z0-9_-]+$/) }).parse(input))
  .handler(async ({ data }) => {
    await unlink(path.join(agentsDir(), `${data.name}.md`))
    return { ok: true }
  })
