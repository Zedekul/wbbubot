import type { Handler, SQSRecord } from "aws-lambda"
import * as TelegramBot from "node-telegram-bot-api"
import { Update } from "node-telegram-bot-api"

import { DedeletedError } from "dedeleted"

import { formatJSONResponse } from "@libs/apiGateway"
import { getBot, getUpdateType, reply } from "@libs/botUtils"
import { BOT_TOKEN, TIMEOUT_TIME } from "@libs/config"
import { middyfy } from "@libs/lambda"

import { onCommand } from "./commands"
import { onInlineQuery } from "./inline"


const handleUpdate = async (bot: TelegramBot, update: TelegramBot.Update): Promise<void> => {
  const type = getUpdateType(update)
  const entity = update[type]
  const timeout = setTimeout(async () => {
    const text = "存档超时"
    if (type === "message") {
      await reply(bot, entity as TelegramBot.Message, text)
    } else if (type === "inline_query") {
      await bot.answerInlineQuery((entity as TelegramBot.InlineQuery).id, [{
        type: "article",
        id: "error",
        title: text,
        input_message_content: {
          message_text: text
        }
      }], {
        cache_time: 10
      })
    }
  }, TIMEOUT_TIME)

  try {
    if (entity === undefined) {
      throw new Error(`Update type ${type} not found`)
    }
    switch (type) {
      case "message":
        await onCommand(bot, entity as TelegramBot.Message)
        break
      case "inline_query":
        await onInlineQuery(bot, entity as TelegramBot.InlineQuery)
        break
      default:
        throw new Error(`Update type ${type} not supported`)
    }
  } catch (e) {
    if (!(e as DedeletedError).skipLogging) {
      console.error(e)
    }
  } finally {
    clearTimeout(timeout)
  }
}

const webhook: Handler<{ Records: SQSRecord[] }> = async (event) => {
  const bot = getBot(BOT_TOKEN)
  await Promise.all(event.Records.map(async (record) => {
    const update = JSON.parse(record.body) as Update
    await handleUpdate(bot, update)
  }))
  return formatJSONResponse()
}

export const main = middyfy(webhook)
