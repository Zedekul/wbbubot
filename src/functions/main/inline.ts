import parseHTML from "node-html-parser"
import * as TelegramBot from "node-telegram-bot-api"
import { InlineKeyboardButton, InlineKeyboardMarkup, InlineQuery, InlineQueryResult, InlineQueryResultDocument, InlineQueryResultPhoto, InlineQueryResultVideo } from "node-telegram-bot-api"

import { backup, BackupResult, DedeletedError, InvalidFormat } from "dedeleted"

import { getConfig, getContents, getOptions, saveResult } from "@libs/backupUtils"
import { BOT_USERNAME } from "@libs/config"
import { isURL } from "@libs/utils"

const getInlineKeyboardMarkup = (result: BackupResult): InlineKeyboardMarkup => ({
  inline_keyboard:[[
    { text: "查看存档", url: result.pages[0].url },
    { text: "全部存档", url: `https://t.me/${BOT_USERNAME}?start=${result.sourceKey}-${result.id}`},
    { text: "查看原文", url: result.source }
  ]]
})

export const prepareResultPages = async (result: BackupResult): Promise<InlineQueryResult> => {
  let text = ""
  const page0 = result.pages[0]
  const contents = getContents(result)
  // Need to go from up to down because the first page is instant-viewed
  while (contents.length > 0) {
    const current = contents.pop()
    text += current.text
    if (contents.length > 0) {
      text += "\n"
    }
  }
  return {
    type: "article",
    id: `${result.sourceKey}-${result.id}`,
    title: `发送 Telegra.ph 页面：${page0.title}`,
    url: page0.url,
    input_message_content: {
      message_text: text,
      parse_mode: "HTML",
    },
    reply_markup: getInlineKeyboardMarkup(result)
  }
}

export const prepareResultInlined = async (result: BackupResult): Promise<InlineQueryResult[]> => {
  const page0 = result.pages[0]
  const replyMarkup = getInlineKeyboardMarkup(result)
  let contents = getContents(result, 10000)
  let textContent = contents.map(x => x.text).join("\n")
  if (parseHTML(textContent).structuredText.length > 4000) {
    contents = getContents(result, 1)
    textContent = contents.map(x => x.text).join("\n")
  }
  const medias = contents.map(x => x.medias).flat()
  const files = contents.map(x => x.files).flat()

  const text = parseHTML(textContent).structuredText
  let shortText = text
  if (shortText.length > 50) {
    shortText = shortText.substr(0, 50) + "..."
  }
  // MediaGroup is yet not supported by inline mode, so let user choose one.
  const results: InlineQueryResult[] = [{
    type: "article",
    id: `${result.sourceKey}-${result.id}-text`,
    title: `发送文字内容：${shortText}`,
    url: page0.url,
    input_message_content: {
      message_text: textContent,
      parse_mode: "HTML",
      disable_web_page_preview: true
    },
    reply_markup: replyMarkup
  }]
  const caption = text.length > 1000 ? text.substr(0, 1000) + "..." : textContent
  let i = 0
  for (const media of medias) {
    const x = {
      type: media.type,
      id: `${result.sourceKey}-${result.id}-media-${i++}`,
      caption,
      parse_mode: "HTML",
      title: `发送${media.type === "photo" ? "图片" : "视频"} (${i})`,
      description: shortText,
      reply_markup: replyMarkup
    }
    if (media.type === "photo") {
      const photo = x as unknown as InlineQueryResultPhoto
      photo.photo_url = media.media
      photo.thumb_url = media.media
      results.push(photo)
    } else {
      const video = x as unknown as InlineQueryResultVideo
      video.video_url = media.media
      video.mime_type = "video/mp4"
      video.thumb_url = ""
      results.push(video)
    }
  }
  i = 0
  for (const file of files) {
    results.push({
      type: "document",
      id: `${result.sourceKey}-${result.id}-file-${i++}`,
      title: `发送文件 (${i})`,
      caption,
      description: shortText,
      parse_mode: "HTML",
      document_url: file,
      reply_markup: replyMarkup
    } as unknown as InlineQueryResultDocument)
  }
  return results
}

export const onInlineQuery = async (bot: TelegramBot, query: InlineQuery): Promise<void> => {
  const { id, query: content } = query
  const [url, ...rest] = content.trim().split(/\s+/)
  try {
    if (url === undefined || !isURL(url)) {
      return
    }
    if (rest.length > 0) {
      throw new InvalidFormat("一次只能输入一个地址")
    }
    const config = await getConfig(query.from.id)
    const options = await getOptions(config)
    const result = await backup(url, options)
    if (result.justCreated) {
      delete result.justCreated
      await saveResult(result)
    }
    const answers = [
      await prepareResultPages(result),
    ].concat(await prepareResultInlined(result))
    await bot.answerInlineQuery(id, answers)
  } catch (e) {
    const err = e as DedeletedError
    const text = err.isDedeletedError && !err.isPrivate
      ? err.message
      : "发生了错误"
    await bot.answerInlineQuery(id, [{
      type: "article",
      id: "error",
      title: text,
      input_message_content: {
        message_text: text
      }
    }])
    throw e
  }
}
