import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteAgentDefinition, getAgentDefinitions, saveAgentDefinition } from './agents.api'

const emptyForm = { name: '', description: '', model: 'sonnet', instructions: '' }

export function AgentDashboard() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['agent-definitions'],
    queryFn: () => getAgentDefinitions(),
    refetchInterval: 2000,
  })

  const save = useMutation({
    mutationFn: () => saveAgentDefinition({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-definitions'] })
      setForm(emptyForm)
      setShowForm(false)
    },
  })

  const remove = useMutation({
    mutationFn: (name: string) => deleteAgentDefinition({ data: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-definitions'] }),
  })

  const select = (agent: (typeof agents)[number]) => {
    setSelected(agent.name)
    setForm({ name: agent.name, description: agent.description, model: agent.model || 'sonnet', instructions: agent.instructions })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Agents</h1>
          <p className="mt-1 text-sm text-gray-400">Claude Code agent definitions</p>
        </div>
        <button type="button" onClick={() => { setSelected(null); setForm(emptyForm); setShowForm(true) }} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
          + New Agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); save.mutate() }} className="rounded-xl border border-gray-800 bg-gray-950 p-5 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-gray-100">{selected ? 'Edit Agent' : 'New Agent'}</h2><button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-300">Cancel</button></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-400">Name<input value={form.name} disabled={!!selected} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-gray-100" placeholder="my-agent" required /></label>
            <label className="text-sm text-gray-400">Model<input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-gray-100" placeholder="sonnet" required /></label>
          </div>
          <label className="block text-sm text-gray-400">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-gray-100" required /></label>
          <label className="block text-sm text-gray-400">Instructions<textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={12} className="mt-1 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-sm text-gray-100" required /></label>
          <button type="submit" disabled={save.isPending} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save Agent'}</button>
          {save.error && <p className="text-sm text-red-400">{save.error.message}</p>}
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading agents…</p>}
      {error && <p className="text-sm text-red-400">Failed to load agents: {error.message}</p>}
      {!isLoading && !error && agents.length === 0 && <div className="rounded-xl border border-gray-800 bg-gray-950 p-8 text-center text-sm text-gray-400">No agent definitions found in ~/.claude/agents/.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <div key={agent.name} className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-medium text-gray-100">{agent.name}</h2><p className="mt-1 text-sm text-gray-400">{agent.description || 'No description'}</p></div><span className="rounded bg-gray-900 px-2 py-1 text-xs text-gray-400">{agent.model || 'default'}</span></div>
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => select(agent)} className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-900">Edit</button><button type="button" onClick={() => { if (window.confirm(`Delete agent ${agent.name}?`)) remove.mutate(agent.name) }} className="rounded-md border border-red-900 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/40">Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
