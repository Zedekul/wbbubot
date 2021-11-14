const TelegramBotConstructor = require("node-telegram-bot-api")

import type * as TelegramBot from "node-telegram-bot-api"

import { Message, SendMessageOptions, Update } from "node-telegram-bot-api"
import { PRODUCTION_MODE } from "./config"
import { makeBatches } from "./utils"

export type UpdateType = Exclude<keyof Update, "update_id">

export const getBot = (token: string): TelegramBot => {
  const bot = new TelegramBotConstructor(token)
  const proxy = new Proxy(bot, {
    get: (target, prop) => {
      const key = String(prop)
      if (key.startsWith("send") && !PRODUCTION_MODE) {
        // Output to console when in development mode
        return (...args: any[]) => {
          console.log(`[${key}]`, ...args)
        }
      }
      return target[prop]
    },

  })
  return proxy
}

export const getUpdateType = (update: Update): UpdateType =>
  Object.keys(update).find(key => key !== "update_id") as UpdateType

export const getUserID = (update: Update): number | undefined => {
  const key = getUpdateType(update)
  const v = update[key]
  if (v === undefined || !("from" in v)) {
    return undefined
  }
  return v.from === undefined ? undefined : v.from.id
}

export const useArgument = (args: string[], arg: string, consume = true): boolean => {
  const i = args.indexOf(arg)
  if (i < 0) {
    return false
  }
  if (consume) {
    args.splice(i, 1)
  }
  return true
}

export const reply = async (
  bot: TelegramBot, message: Message, text: string,
  replyToMessage = false,
  options: SendMessageOptions = {}
): Promise<Message> => {
  if (replyToMessage) {
    options.reply_to_message_id = message.message_id
  }
  return await bot.sendMessage(message.chat.id, text, options)
}

export interface MessageContent {
  text: string,
  medias: TelegramBot.InputMedia[]
  files: string[],
  showPreview: boolean
  parseMode?: "HTML" | "Markdown"
}

export const sendContent = async (
  bot: TelegramBot, chatID: number,
  content: MessageContent
): Promise<Message[]> => {
  const results: Message[] = []
  const { text, medias, showPreview } = content
  const options: SendMessageOptions = {
    parse_mode: content.parseMode === undefined ? "Markdown" : "HTML",
    disable_web_page_preview: !showPreview
  }
  const nMedia = medias.length
  if (nMedia === 1) {
    const media = medias[0]
    let caption = text
    if (text.length > 1024) {
      results.push(await bot.sendMessage(chatID, text, options))
      caption = ""
    }
    if (media.type === "photo") {
      results.push(await bot.sendPhoto(chatID, media.media, {
        caption,
        ...options
      }))
    } else {
      results.push(await bot.sendVideo(chatID, media.media, {
        caption,
        ...options
      }))
    }
  } else if (nMedia > 0) {
    for (const batch of makeBatches(medias, 10)) {
      results.push(await bot.sendMediaGroup(chatID, batch.map((media, i) => {
        if (i === 0) {
          media.caption = text
          if (options.parse_mode !== undefined) {
            media.parse_mode = options.parse_mode
          }
        }
        return media
      }), {
        ...options
      }))
    }
  } else {
    results.push(await bot.sendMessage(chatID, text, options))
  }
  let i = 0
  for (const file of content.files) {
    results.push(await bot.sendDocument(chatID, file, {
      caption: `附件 ${i++}`,
      ...options
    }))
  }
  return results
}
