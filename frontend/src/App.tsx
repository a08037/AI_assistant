import React, { useEffect, useState } from 'react'
import ChatList from './components/ChatList'
import ChatWindow from './components/ChatWindow'
import ModelSelect from './components/ModelSelect'
import SystemPrompt from './components/SystemPrompt'
import { getChats, createChat, updateChat, deleteChat, type ChatRef, resetSession } from './api'

export default function App() {
  const [chats, setChats] = useState<ChatRef[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string>()
  const [model, setModel] = useState<string>('gpt-4o-mini')
  const [systemPrompt, setSystemPrompt] = useState<string>(`
    Ты — Нейропомощник AI.
    
    Помогаешь пользователю:
    - составлять планы дня;
    - создавать чек-листы;
    - генерировать шаблоны документов;
    - придумывать идеи проектов;
    - помогать в обучении.
    `)

  async function load() {
    const data = await getChats()
    // Если чатов нет — создаём первый автоматически
    if (data.length === 0) {
      const firstChat = await createChat('Новый чат')

      setChats([firstChat])
      setSelectedChatId(firstChat.id)

      console.log('Создан первый чат:', firstChat.id)
      return
    }

    setChats(data)

    if (!selectedChatId) {
      setSelectedChatId(data[0].id)
  }
}

  useEffect(() => { load() }, [])

  async function onCreate() {
    const title = prompt('Название чата', 'Новый запрос'
) || 'Новый запрос'
    const c = await createChat(title)
    setChats(prev => [...prev, c])
    setSelectedChatId(c.id)
  }

  async function onResetSession() {
    await resetSession()
  
    const firstChat = await createChat('Новый чат')
  
    setChats([firstChat])
    setSelectedChatId(firstChat.id)
  }

  async function onRename(id: string, title: string) {
    const c = await updateChat(id, title)
    setChats(prev => prev.map(x => x.id === id ? c : x))
  }

  async function onDelete(id: string) {
    await deleteChat(id)
    setChats(prev => prev.filter(x => x.id !== id))
    if (selectedChatId === id) setSelectedChatId(undefined)
  }

  return (
    <div className="h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r border-zinc-800 p-3">
        <ChatList
          chats={chats}
          selectedId={selectedChatId}
          onSelect={setSelectedChatId}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
        />
    <div className="mt-4 flex gap-2">
      <button
        className="text-xs bg-zinc-700 rounded-lg px-3 py-1"
        onClick={onResetSession}
>
        Сброс сессии
      </button>
      
        </div>
      </aside>
      <main className="flex flex-col">
      <header className="border-b border-zinc-800 p-3 flex items-center gap-3">
  <div>
    <h1 className="text-xl font-bold">
      Нейропомощник AI
    </h1>

    <p className="text-sm opacity-70">
      Планы, чек-листы, идеи и решения задач
    </p>
  </div>

  <div className="flex-1" />

  <ModelSelect
    model={model}
    onChange={setModel}
  />
</header>
        <section className="grid grid-rows-[auto_1fr] gap-3 p-3 h-[calc(100vh-57px)]">
          <SystemPrompt value={systemPrompt} onChange={setSystemPrompt} />
          <div className="min-h-0">
            <ChatWindow chatId={selectedChatId} model={model} systemPrompt={systemPrompt} />
            <div className="flex flex-wrap gap-2">
  <button
    className="px-3 py-1 rounded-lg bg-zinc-800"
    onClick={() =>
      setSystemPrompt(
        "Помогай составлять планы дня и чек-листы."
      )
    }
  >
    Планировщик
  </button>

  <button
    className="px-3 py-1 rounded-lg bg-zinc-800"
    onClick={() =>
      setSystemPrompt(
        "Помогай генерировать идеи для бизнеса."
      )
    }
  >
    Идеи
  </button>

  <button
    className="px-3 py-1 rounded-lg bg-zinc-800"
    onClick={() =>
      setSystemPrompt(
        "Помогай готовиться к собеседованиям."
      )
    }
  >
    Собеседование
  </button>
</div>
          </div>
        </section>
      </main>
    </div>
  )
}
