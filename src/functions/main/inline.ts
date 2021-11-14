import { DedeletedError } from "dedeleted"
import * as TelegramBot from "node-telegram-bot-api"
import { InlineQuery } from "node-telegram-bot-api"

export const onInlineQuery = async (bot: TelegramBot, message: InlineQuery): Promise<void> => {
  try {
  } catch (e) {
    const err = e as DedeletedError
    const text = err.isDedeletedError && !err.isPrivate
      ? err.message
      : "发生了错误"
    // set inline results
    throw e
  }
}
