// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { NotificationBody } from '../../api/types'
import { testInstanceData, testMessageNotification } from '../../test/fixtures'
import { getMessageText, parseNotification } from './notifications'

const instanceData = testInstanceData
const messageNotification = testMessageNotification

describe('parseNotification: сообщения', () => {
  it('входящее текстовое сообщение', () => {
    expect(parseNotification(messageNotification())).toEqual({
      type: 'message',
      chat: { chatId: '10000000', name: 'Василиса Премудрая', phone: '79876543210' },
      message: {
        id: '126543123451133331119',
        idMessage: '126543123451133331119',
        chatId: '10000000',
        text: 'Привет!',
        timestamp: 1763115112000,
        direction: 'in',
        status: undefined,
      },
    })
  })

  it('без имени в записной книжке берёт имя отправителя', () => {
    const body = messageNotification()
    body.senderData = { ...body.senderData, senderContactName: '', senderPhoneNumber: 0 }

    expect(parseNotification(body)).toMatchObject({
      chat: { name: 'Василиса', phone: undefined },
    })
  })

  it('сообщение, отправленное с телефона, — исходящее в чат получателя', () => {
    const body = messageNotification({
      typeWebhook: 'outgoingMessageReceived',
      senderData: {
        chatId: '10000000',
        chatName: 'Иван Царевич',
        chatType: 'user',
        sender: '20000000',
        senderName: 'Василиса Премудрая',
        senderPhoneNumber: 79876543210,
      },
    })

    expect(parseNotification(body)).toMatchObject({
      chat: { chatId: '10000000', name: 'Иван Царевич', phone: undefined },
      message: { direction: 'out', status: 'sent' },
    })
  })

  it('эхо сообщения, отправленного через API', () => {
    expect(
      parseNotification(messageNotification({ typeWebhook: 'outgoingAPIMessageReceived' })),
    ).toMatchObject({ message: { direction: 'out', status: 'sent', text: 'Привет!' } })
  })

  it('пропускает групповые чаты и каналы', () => {
    const group = messageNotification()
    group.senderData = { ...group.senderData, chatId: '-10000000000000', chatType: 'group' }
    const channel = messageNotification()
    channel.senderData = { ...channel.senderData, chatType: 'channel' }

    expect(parseNotification(group)).toEqual({ type: 'ignored' })
    expect(parseNotification(channel)).toEqual({ type: 'ignored' })
  })
})

describe('getMessageText', () => {
  it('текст из textMessage, extendedTextMessage и ответа с цитатой', () => {
    expect(
      getMessageText({ typeMessage: 'textMessage', textMessageData: { textMessage: 'a' } }),
    ).toBe('a')
    expect(
      getMessageText({
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com', title: 'GREEN-API' },
      }),
    ).toBe('https://green-api.com')
    expect(
      getMessageText({
        typeMessage: 'quotedMessage',
        extendedTextMessageData: { text: 'Ответ' },
      }),
    ).toBe('Ответ')
  })

  it('заглушка для медиа и пропуск служебных типов', () => {
    expect(getMessageText({ typeMessage: 'imageMessage' })).toBe('[Фото]')
    expect(getMessageText({ typeMessage: 'stickerMessage' })).toBe('[Стикер]')
    expect(getMessageText({ typeMessage: 'reactionMessage' })).toBeNull()
    expect(getMessageText({ typeMessage: 'deletedMessage' })).toBeNull()
  })
})

describe('parseNotification: служебные уведомления', () => {
  it('статус доставки', () => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        instanceData,
        timestamp: 1755591519,
        chatId: '10000000',
        idMessage: '115054445839974415',
        status: 'delivered',
      }),
    ).toEqual({
      type: 'status',
      chatId: '10000000',
      idMessage: '115054445839974415',
      status: 'delivered',
    })
  })

  it('noAccount считается ошибкой отправки', () => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        instanceData,
        timestamp: 1,
        chatId: '1',
        idMessage: 'x',
        status: 'noAccount',
        description: 'chatId unresolvable on this session',
      }),
    ).toMatchObject({ type: 'status', status: 'failed' })
  })

  it('смена статуса инстанса и превышение квоты', () => {
    expect(
      parseNotification({
        typeWebhook: 'stateInstanceChanged',
        instanceData,
        timestamp: 1,
        stateInstance: 'notAuthorized',
      }),
    ).toEqual({ type: 'state', stateInstance: 'notAuthorized' })

    expect(
      parseNotification({
        typeWebhook: 'quotaExceeded',
        instanceData,
        quotaData: {
          method: 'correspondents',
          used: 3,
          total: 3,
          status: 'CORRESPONDENTS_QUOTA_EXCEEDED',
          description: 'Достигнут лимит в 3 чата на тарифе Developer',
        },
      }),
    ).toEqual({ type: 'quota', description: 'Достигнут лимит в 3 чата на тарифе Developer' })
  })

  it('незнакомый тип уведомления пропускается', () => {
    expect(
      parseNotification({ typeWebhook: 'incomingCall' } as unknown as NotificationBody),
    ).toEqual({ type: 'ignored' })
  })
})
