import React from 'react'
export default function SystemPrompt({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-xl p-3"
      placeholder="Настройте поведение Нейропомощника"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}
