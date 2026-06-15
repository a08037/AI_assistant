import React from 'react'
import type { Message as TMessage } from '../api'

export default function Message({ msg }: { msg: TMessage }) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const bubble = isSystem ? 'bg-amber-200/10 border border-amber-500/30' :
                isUser ? 'bg-emerald-200/10 border border-emerald-500/30' :
                         'bg-zinc-800 border border-zinc-700'
  const label  = isSystem ? 'Нейропомощник' :
                isUser ? 'Вы' :
                'AI'
  return (
    <div className={`rounded-2xl px-4 py-3 ${bubble}`}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
    </div>
  )
}
