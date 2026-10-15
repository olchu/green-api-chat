import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './Composer.module.css'

interface ComposerProps {
  maxLength: number
  onSend: (text: string) => void
}

/** Счётчик символов появляется, когда набрано 90% лимита */
const COUNTER_THRESHOLD = 0.9

export function Composer({ maxLength, onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const message = text.trim()
  const tooLong = text.length > maxLength
  const canSend = message.length > 0 && !tooLong

  // Поле растёт по содержимому до max-height из CSS
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [text])

  function send(event?: FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    onSend(message)
    setText('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter отправляет, Shift+Enter — перенос строки; во время ввода через IME не мешаем
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event)
  }

  return (
    <form className={styles.composer} onSubmit={send}>
      <div className={styles.field}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          rows={1}
          placeholder="Сообщение"
          aria-label="Сообщение"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {text.length >= maxLength * COUNTER_THRESHOLD && (
          <span className={styles.counter} data-over={tooLong} aria-live="polite">
            {text.length} / {maxLength}
          </span>
        )}
        <button className={styles.send} type="submit" disabled={!canSend} aria-label="Отправить">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 19V5m0 0-6 6m6-6 6 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  )
}
