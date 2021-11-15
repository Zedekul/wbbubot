import type { Handler, SQSRecord } from "aws-lambda"
import * as TelegramBot from "node-telegram-bot-api"
import { Update } from "node-telegram-bot-api"

import { formatJSONResponse } from "@libs/apiGateway"
import { getUpdateType } from "@libs/botUtils"
import { BOT_TOKEN } from "@libs/config"
import { middyfy } from "@libs/lambda"

import { onCommand } from "./commands"
import { onInlineQuery } from "./inline"


const handleUpdate = async (bot: TelegramBot, update: TelegramBot.Update) => {
  const type = getUpdateType(update)
  if (!(type in update)) {
    throw new Error(`Update type ${type} not found`)
  }
  switch (type) {
    case "message":
      await onCommand(bot, update.message)
      break
    case "inline_query":
      await onInlineQuery(bot, update.inline_query)
      break
  }
}

const webhook: Handler<{ Records: SQSRecord[] }> = async (event) => {
  const bot = new TelegramBot(BOT_TOKEN)
  for (const record of event.Records) {
    const update = JSON.parse(record.body) as Update
    handleUpdate(bot, update)
  }
  return formatJSONResponse()
}

export const main = middyfy(webhook)
