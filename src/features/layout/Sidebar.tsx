import { useState } from 'react'
import { ChatList } from '../chats/ChatList'
import { NewChatForm } from '../chats/NewChatForm'
import { SidebarHeader } from './SidebarHeader'

export function Sidebar() {
  const [creating, setCreating] = useState(false)

  if (creating) return <NewChatForm onClose={() => setCreating(false)} />

  return (
    <>
      <SidebarHeader onNewChat={() => setCreating(true)} />
      <ChatList />
    </>
  )
}
