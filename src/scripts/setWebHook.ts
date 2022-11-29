import { getBot } from "@libs/botUtils"
import { BOT_TOKEN } from "@libs/config"
import { SetWebHookOptions } from "node-telegram-bot-api"

const setup = async () => {
  const bot = getBot(BOT_TOKEN)
  const webhookURL = process.env.WEBHOOK_URL
  if (!webhookURL) {
    throw new Error("WEBHOOK_URL is not defined")
  }
  const result = await bot.setWebHook(webhookURL, {
    // The bot only reacts to these updates for now
    allowed_updates: ["message", "inline_query"],
    drop_pending_updates: true,
  } as unknown as SetWebHookOptions)
  console.log(result)
}

setup().catch(console.error)
