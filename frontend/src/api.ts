export type Role = 'system' | 'user' | 'assistant'
export interface Message { role: Role; content: string }
export interface ChatRef { id: string; title: string }

export async function getChats(): Promise<ChatRef[]> {
  const res = await fetch('/api/v1/chats')
  if (!res.ok) throw new Error('Failed to load chats')
  return res.json()
}
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`/api/v1/chats/${chatId}/messages`)
  if (!res.ok) throw new Error('Failed to load messages')
  return res.json()
}
export async function createChat(title: string): Promise<ChatRef> {
  const res = await fetch('/api/v1/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
  if (!res.ok) throw new Error('Failed to create chat')
  return res.json()
}
export async function updateChat(chatId: string, title: string): Promise<ChatRef> {
  const res = await fetch(`/api/v1/chats/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
  if (!res.ok) throw new Error('Failed to update chat')
  return res.json()
}
export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`/api/v1/chats/${chatId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete chat')
}
export async function sendMessage(payload: {
  chat_id: string; user_message: string; model: string; system_prompt: string;
}): Promise<{assistant: string}> {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Chat request failed')
  return res.json()
}
export function createStreamUrl(q: {
  chat_id: string; user_message: string; model: string; system_prompt: string;
}): string {
  const params = new URLSearchParams({
    chat_id: q.chat_id,
    user_message: q.user_message,
    model: q.model,
    system_prompt: q.system_prompt || ''
  })
  return `/api/v1/chat/stream?${params.toString()}`
}
export async function resetSession(): Promise<void> {
  const res = await fetch('/api/v1/reset-session', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reset session')
}
