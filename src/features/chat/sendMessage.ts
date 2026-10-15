import { getSessionClient } from '../../api/useGreenApi'
import { useChatStore, type Message } from '../../store/chatStore'

function localId(): string {
  // randomUUID есть только в защищённом контексте (https, localhost)
  return `local-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
}

/** Отправляет уже показанное в ленте сообщение и записывает итог */
async function deliver(message: Message): Promise<void> {
  const session = getSessionClient()
  if (!session) return
  const { client, instanceId } = session
  const { resolveMessage } = useChatStore.getState()
  try {
    const { idMessage } = await client.sendMessage({
      chatId: message.chatId,
      message: message.text,
    })
    resolveMessage(instanceId, message.chatId, message.id, { status: 'sent', idMessage })
  } catch {
    resolveMessage(instanceId, message.chatId, message.id, { status: 'failed' })
  }
}

/** Сразу показывает сообщение со статусом «отправляется», затем отправляет */
export function sendChatMessage(chatId: string, text: string): Promise<void> {
  const instanceId = getSessionClient()?.instanceId
  if (!instanceId) return Promise.resolve()
  const message: Message = {
    id: localId(),
    chatId,
    text,
    timestamp: Date.now(),
    direction: 'out',
    status: 'pending',
  }
  useChatStore.getState().addMessage(instanceId, message)
  return deliver(message)
}

/** Повторная отправка сообщения, которое не дошло до GREEN-API */
export function retryChatMessage(message: Message): Promise<void> {
  const instanceId = getSessionClient()?.instanceId
  if (!instanceId) return Promise.resolve()
  useChatStore.getState().updateMessage(instanceId, message.chatId, message.id, {
    status: 'pending',
    timestamp: Date.now(),
  })
  return deliver(message)
}
