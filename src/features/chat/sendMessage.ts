import type { GreenApiClient } from '../../api/greenApi'
import { useChatStore, type Message } from '../../store/chatStore'

function localId(): string {
  return `local-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
}

/** Отправляет уже показанное в ленте сообщение и обновляет его статус */
async function deliver(client: GreenApiClient, instanceId: string, message: Message) {
  const { updateMessage } = useChatStore.getState()
  try {
    const { idMessage } = await client.sendMessage({
      chatId: message.chatId,
      message: message.text,
    })
    updateMessage(instanceId, message.chatId, message.id, { idMessage, status: 'sent' })
  } catch {
    updateMessage(instanceId, message.chatId, message.id, { status: 'failed' })
  }
}

/** Сразу показывает сообщение со статусом «отправляется», затем отправляет */
export function sendChatMessage(
  client: GreenApiClient,
  instanceId: string,
  chatId: string,
  text: string,
): Promise<void> {
  const message: Message = {
    id: localId(),
    chatId,
    text,
    timestamp: Date.now(),
    direction: 'out',
    status: 'pending',
  }
  useChatStore.getState().addMessage(instanceId, message)
  return deliver(client, instanceId, message)
}

/** Повторная отправка сообщения, которое не дошло до GREEN-API */
export function retryChatMessage(
  client: GreenApiClient,
  instanceId: string,
  message: Message,
): Promise<void> {
  useChatStore.getState().updateMessage(instanceId, message.chatId, message.id, {
    status: 'pending',
    timestamp: Date.now(),
  })
  return deliver(client, instanceId, message)
}
