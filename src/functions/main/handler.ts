import type { Handler, SQSRecord } from "aws-lambda"
import * as TelegramBot from "node-telegram-bot-api"
import { Update } from "node-telegram-bot-api"

import { formatJSONResponse } from "@libs/apiGateway"
import { getBot, getUpdateType } from "@libs/botUtils"
import { BOT_TOKEN } from "@libs/config"
import { middyfy } from "@libs/lambda"

import { onCommand } from "./commands"
import { onInlineQuery } from "./inline"


const handleUpdate = async (bot: TelegramBot, update: TelegramBot.Update) => {
  const type = getUpdateType(update)
  const entity = update[type]
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
  }
}

const webhook: Handler<{ Records: SQSRecord[] }> = async (event) => {
  const bot = getBot(BOT_TOKEN)
  for (const record of event.Records) {
    const update = JSON.parse(record.body) as Update
    handleUpdate(bot, update)
  }
  return formatJSONResponse()
}

export const main = middyfy(webhook)
