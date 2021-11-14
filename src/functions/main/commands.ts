import * as assert from "assert"

import * as TelegramBot from "node-telegram-bot-api"
import { Message } from "node-telegram-bot-api"
import { CookieJar } from "tough-cookie"

import { backup, AWSS3Settings, DedeletedError, InvalidFormat } from "dedeleted"

import { getConfig, getContents, getOptions, getShareGroup, saveResult, updateConfig, updateShareGroup } from "@libs/backupUtils"
import { reply } from "@libs/botUtils"
import { BOT_DOCS_URL } from "@libs/config"
import { hashPassword } from "@libs/utils"

type CommandHandler = (bot: TelegramBot, command: string, args: string[], message: Message) => Promise<void>

const throwUsage = (usage: string): never => { throw new InvalidFormat(`使用方法为 \`${usage}\``) }

const cookieCommandUsage = "/cookie url [cookie_string]"
const onCookieCommand: CommandHandler = async (bot, _, args, message) => {
  if (args.length < 1 || args.length > 2) {
    throwUsage(cookieCommandUsage)
  }
  const config = await getConfig(message.chat.id)
  const cookieJar = config.cookies === undefined
    ? new CookieJar()
    : await CookieJar.deserialize(config.cookies)
  const [url, cookieString] = args
  if (cookieString === undefined) {
    const cookie = await cookieJar.getCookieString(url)
    if (!cookie) {
      throw new DedeletedError(`没有找到对应的 Cookie: ${url}`)
    } else {
      await reply(bot, message, `当前在 ${url} 上的 Cookie 为: ${cookie}`)
    }
  } else {
    await cookieJar.setCookie(cookieString, url)
    await reply(bot, message, `Cookie 设置更新成功！`)
  }
}

const configS3CommandUsage = "/config-s3 {\"accessPoint\":\"ACCESS_POINT_NAME\""
  + ",\"accountID\":\"ACCOUNT_ID\",\"bucket\":\"BUCKET_NAME\",\"region\":\"REGION\"}"
const onConfigS3Command: CommandHandler = async (bot, _, args, message) => {
  try {
    assert(args.length === 1)
    const input = JSON.parse(args[0]) as { string: unknown }
    const result: Partial<AWSS3Settings> = {}
    for (const key of ["accessPoint", "accountID", "bucket", "region"]) {
      assert(input[key] !== undefined)
      result[key] = input[key].toString()
      delete input[key]
    }
    assert(Object.keys(input).length === 0)
    const config = await getConfig(message.chat.id)
    const isCreating = config.awsS3 === undefined
    config.awsS3 = result as AWSS3Settings
    await updateConfig(config)
    await reply(bot, message, `AWS S3 设置${isCreating ? "创建" : "更新"}成功！`)
  } catch (e) {
    throwUsage(configS3CommandUsage)
  }
}

const GroupNameRegex = /^[a-zA-Z0-9_]+$/
const PasswordRegex = /^[a-zA-Z0-9#?!@$%^&*-]+$/
const shareCommandUsage = (command: string) =>
  `${command} [group_name] [password]`
const onShareCommand: CommandHandler = async (bot, command, args, message) => {
  const userID = message.from.id
  const config = await getConfig(userID)
  const argc = args.length
  const currentGroup = config.shareGroup
  const hasGroup = currentGroup !== undefined
  if (command === "/stop-share") {
    if (argc !== 1) {
      throwUsage(shareCommandUsage(command))
    }
    if (!hasGroup) {
      throw new DedeletedError("当前没有加入任何共享组")
    } else if (currentGroup !== args[0]) {
      throw new DedeletedError(`需要输入正确的名称才可以退出一个共享组`)
    }
    delete config.isOwner
    delete config.shareGroup
    await updateConfig(config)
    await reply(bot, message, `已退出共享组 ${currentGroup}`)
    // TODO: 创建者退出共享组后，会变成野组
    return
  }
  const isCreating = command === "/create-share"
  if (!isCreating && argc === 0) {
    await reply(bot, message, hasGroup
      ? `当前共享组为: ${currentGroup}`
      : "当前没有加入任何共享组"
    )
    return
  }
  if (argc !== 2) {
    throwUsage(shareCommandUsage(command))
  }
  const [groupName, password] = args
  const hashedPassword = hashPassword(password)
  if (hasGroup && (!isCreating || currentGroup !== groupName)) {
    throw new DedeletedError(`当前已经加入共享组 ${currentGroup}，请先退出才可以创建/加入新的组`)
  }
  if (isCreating) {
    if (hasGroup && !config.isOwner) {
      throw new DedeletedError("只有创建者可以更改密码")
    }
    if (!GroupNameRegex.test(groupName) || !PasswordRegex.test(password)) {
      throw new InvalidFormat(`请参见 [Bot 说明](${BOT_DOCS_URL})`)
    }
    await updateShareGroup(groupName, userID, hashedPassword)
    if (!hasGroup) {
      await updateConfig({ ...config, isOwner: true, shareGroup: groupName })
    }
    await reply(bot, message, `共享组 ${groupName} ${hasGroup ? "密码更新" : "创建"}成功！`)
    return
  }
  const shareGroup = await getShareGroup(groupName)
  if (shareGroup.password === hashedPassword) {
    await updateConfig({ ...config, shareGroup: groupName })
  }
}

const onOther: CommandHandler = async (bot, url, args, message) => {
  if (message.from === undefined) {
    return
  }
  const config = await getConfig(message.from.id)
  const options = await getOptions(config)
  const result = await backup(url, options)
  saveResult(result).catch(console.error)
  const contents = getContents(result, args)
  for (const content of contents) {
    await reply(bot, message, content.content, false, {
      parse_mode: "HTML",
      disable_web_page_preview: !content.showPreview,
    })
  }
}

export const onCommand = async (bot: TelegramBot, message: Message): Promise<void> => {
  try {
    if (message.text === undefined || message.from === undefined) {
      await reply(bot, message, "不支持的命令。")
      return
    }
    const [command, ...rest] = message.text.trim().split(/\s+/)
    if (command.startsWith("/")) {
      switch (command) {
        case "/cookie":
          await onCookieCommand(bot, command, rest, message)
          break
        case "/config-s3":
          await onConfigS3Command(bot, command, rest, message)
          break
        case "/create-share":
        case "/share":
          await onShareCommand(bot, command, rest, message)
          break
      }
    } else {
      onOther(bot, command, rest, message)
    }
  } catch (e) {
    const err = e as DedeletedError
    const text = err.isDedeletedError && !err.isPrivate
      ? err.message
      : "发生了错误"
    await reply(bot, message, text)
    throw e
  }
}

