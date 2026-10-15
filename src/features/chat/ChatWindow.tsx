import { useInstanceId, useMessenger } from '../../store/authStore'
import { useActiveChat, useChatStore } from '../../store/chatStore'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { sendChatMessage } from './sendMessage'
import styles from './ChatWindow.module.css'

export function ChatWindow() {
  const instanceId = useInstanceId()
  const chat = useActiveChat(instanceId)
  const messenger = useMessenger()

  if (!chat) {
    return <span className={styles.hint}>Выберите чат, чтобы начать переписку</span>
  }

  return (
    <section className={styles.window} aria-label={`Чат с ${chat.name}`}>
      <ChatHeader chat={chat} onClose={() => useChatStore.getState().openChat(instanceId, null)} />
      <MessageList instanceId={instanceId} chatId={chat.chatId} />
      {/* key: черновик не переносится в другой чат */}
      <Composer
        key={chat.chatId}
        maxLength={messenger.maxMessageLength}
        onSend={(text) => void sendChatMessage(chat.chatId, text)}
      />
    </section>
  )
}
