import React from 'react'
const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']
export default function ModelSelect({ model, onChange }: { model: string; onChange: (m: string) => void }) {
  return (
    <select
      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2"
      value={model}
      onChange={e => onChange(e.target.value)}
    >
      {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
    </select>
  )
}
