import React, { useEffect, useRef, useState } from 'react'
import type { Message } from '../api'
import MessageView from './Message'
import { createStreamUrl, sendMessage } from '../api'

export default function ChatWindow({
  chatId, model, systemPrompt
}: { chatId?: string, model: string, systemPrompt: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, streaming])

  useEffect(() => {
    if (!chatId) { setMessages([]); return }
    fetch(`/api/v1/chats/${chatId}/messages`).then(async r => {
      if (!r.ok) throw new Error('load messages failed')
      const data = await r.json()
      setMessages(data)
    })
  }, [chatId])

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault()

    console.log('=== SEND CLICK ===')
    console.log('chatId:', chatId)
    console.log('input:', input)
    console.log('model:', model)

    if (!chatId || !input.trim()) {
        console.log('Отправка отменена:', {
          hasChatId: !!chatId,
          hasInput: !!input.trim()
        })
        return
      }

    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const currentInput = input
    setInput('')

    try {
      setStreaming(true)
      const url = createStreamUrl({
        chat_id: chatId,
        user_message: currentInput,
        model,
        system_prompt: systemPrompt
      })
      const ev = new EventSource(url)
      let assistant: Message | null = { role: 'assistant', content: '' }
      setMessages(prev => [...prev, assistant])

      ev.onmessage = (msg) => {
        if (msg.data === '[DONE]') {
          ev.close()
          setStreaming(false)
          return
        }
        try {
          const data = JSON.parse(msg.data)
          if (data?.delta) {
            assistant = assistant ? { ...assistant, content: assistant.content + data.delta } : null
            if (assistant) setMessages(prev => [...prev.slice(0, -1), assistant!])
          }
          if (data?.error) {
            console.error('stream error', data.error)
            // Показываем ошибку пользователю
            if (assistant) {
              assistant = { ...assistant, content: `❌ ${data.error}` }
              setMessages(prev => [...prev.slice(0, -1), assistant!])
            }
            ev.close()
            setStreaming(false)
          }
        } catch {
          if (assistant) {
            assistant = { ...assistant, content: assistant.content + msg.data }
            setMessages(prev => [...prev.slice(0, -1), assistant!])
          }
        }
      }

      ev.onerror = () => {
        ev.close()
        setStreaming(false)
        // Фоллбек на не-стримовый POST
        sendMessage({
          chat_id: chatId,
          user_message: currentInput,
          model,
          system_prompt: systemPrompt
        }).then(r => {
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: r.assistant }])
        }).catch(() => {
          setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Ошибка запроса' }])
        })
      }

    } catch (e) {
      console.error(e)
      setStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {messages.map((m, i) => <MessageView key={i} msg={m} />)}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSend} className="mt-2 flex gap-2">
        <input
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2"
          placeholder="Например: составь план дня Python-разработчика"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!chatId || streaming}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl px-4 py-2"
        >
          {streaming ? 'Стрим...' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}
