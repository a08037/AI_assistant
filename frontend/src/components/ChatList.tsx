import React, { useState } from 'react'
import type { ChatRef } from '../api'

export default function ChatList({
  chats, selectedId, onSelect, onCreate, onRename, onDelete
}: {
  chats: ChatRef[]
  selectedId?: string
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string>()
  const [draftTitle, setDraftTitle] = useState<string>('')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-wide opacity-70">Чаты</div>
        <button className="text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1"
          onClick={onCreate}>+ Новый</button>
      </div>
      <div className="flex flex-col gap-1">
        {chats.map(c => {
          const selected = c.id === selectedId
          return (
            <div key={c.id}
                 className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer ${selected ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}
                 onClick={() => onSelect(c.id)}>
              {editingId === c.id ? (
                <form className="flex-1 flex gap-2" onSubmit={(e) => {
                  e.preventDefault()
                  onRename(c.id, draftTitle || c.title)
                  setEditingId(undefined)
                }}>
                  <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1"
                         autoFocus defaultValue={c.title}
                         onChange={e => setDraftTitle(e.target.value)} />
                  <button className="text-xs bg-emerald-700 rounded px-2">OK</button>
                </form>
              ) : (
                <>
                  <div className="flex-1 truncate">{c.title}</div>
                  <button className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-zinc-700"
                          onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setDraftTitle(c.title) }}>
                    Переимен.
                  </button>
                  <button className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Удалить чат?')) onDelete(c.id)
                          }}>
                    Удалить
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
