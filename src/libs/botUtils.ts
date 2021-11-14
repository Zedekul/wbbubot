const TelegramBotConstructor = require("node-telegram-bot-api")

import type * as TelegramBot from "node-telegram-bot-api"

import { Message, SendMessageOptions, Update } from "node-telegram-bot-api"
import { PRODUCTION_MODE } from "./config"

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

export const getUserID = (update: Update): number | undefined =>{
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

export const reply = (
  bot: TelegramBot, message: Message, text: string,
  replyToMessage = false,
  options: SendMessageOptions = {}
): Promise<Message> =>
  bot.sendMessage(message.chat.id, text, {
    reply_to_message_id: replyToMessage ? message.message_id : undefined,
    ...options
  })
