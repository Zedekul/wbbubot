import * as TelegramBot from "node-telegram-bot-api"
import { Message } from "node-telegram-bot-api"

import { backup, DedeletedError } from "dedeleted"

import { getContents, getOptions, saveResult } from "@libs/backupUtils"

const onOther = async (
  bot: TelegramBot,
  url: string,
  args: string[],
  message: Message
) => {
  try {
    const options = await getOptions(message)
    console.log(url)
    console.log(options)
    const result = await backup(url, options)
    saveResult(result).catch(console.error)
    const contents = getContents(result, args)
    for (const content of contents) {
      await bot.sendMessage(
        message.chat.id,
        content.content,
        {
          parse_mode: "HTML",
          disable_web_page_preview: !content.showPreview,
        }
      )
    }
  } catch (e) {
    console.error(e)
    const err = e as DedeletedError
    const text = err.isDedeletedError && !err.isPrivate
      ? err.message
      : "发生了错误"
    await bot.sendMessage(message.chat.id, text)
  }
}

export const onCommand = async (bot: TelegramBot, message: Message) => {
  if (message.text === undefined) {
    return
  }
  const [command, ...rest] = message.text.trim().split(/\s+/)
  if (command.startsWith("/")) {
    switch (command) {

    }
  } else {
    onOther(bot, command, rest, message)
  }
}
