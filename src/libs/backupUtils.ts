import { CookieJar } from "tough-cookie"

import { BackupResult, BackupOptions, createAccount } from "dedeleted"

import { TABLE_BACKUPS, TABLE_CONFIGS, SHARE_GROUP_INDEX, TABLE_SHARE_GROUPS } from "./config"
import { BackupKey, BackupEntity, ConfigEntity, ShareGroupEntity } from "./dbEntities"
import { getItem, putItem, putBatch, indexQuery } from "./dynamoDB"
import { useArgument } from "./botUtils"
import { shuffle } from "./utils"

export const getContents = (result: BackupResult, args: string[], reposting = false): {
  content: string,
  showPreview: boolean
}[] => {
  const { reposted } = result
  const isTextContent = useArgument(args, "text")
  const contents = reposted.length > 0
    ? reposted.map(x => getContents(x, args, true)).flat()
    : []
  let content = reposting ? "转发自: " : ""
  let showPreview = true
  const pages = result.pages
  if (isTextContent || pages.length === 0) {
    if (result.authorName !== undefined) {
      content += `@${result.authorName}: `
    }
    content += result.content
    content += ` (<a href="${result.source}">source</a>)`
    showPreview = false
  } else if (pages.length === 1) {
    content += `<a href="${pages[0].url}">${pages[0].title}</a>`
  } else {
    pages.forEach((page, i) => {
      if (i > 0) {
        content += "\n"
      }
      content += `<a href="${page.url}">${page.title}</a>`
    })
  }
  contents.push({ content, showPreview })
  return contents
}

export const getExistingBackup = async (key: BackupKey): Promise<BackupResult | undefined> => {
  let entity = await getItem<BackupEntity>(TABLE_BACKUPS, key)
  if (entity === undefined) {
    return undefined
  }
  const reposted = (await Promise.all(entity.reposted.map(async x => getExistingBackup(x))))
    .filter(x => x !== undefined) as BackupResult[]
  delete entity.reposted
  const result = entity as unknown as BackupResult
  result.reposted = reposted
  return result
}

export const getDefaultOptions = (): Partial<BackupOptions> => ({
  checkExisting: (sourceKey, id) => getExistingBackup({ sourceKey, id })
})

export const getConfig = async (userID: number): Promise<ConfigEntity> => {
  const config = await getItem<ConfigEntity>(
    TABLE_CONFIGS, { userID }
  ) || await updateConfig({
    userID,
    telegraphAccount: await createAccount(userID.toString())
  })
  return config
}

export const getOptions = async (config: ConfigEntity): Promise<Partial<BackupOptions>> => {
  const options = getDefaultOptions()
  options.telegraphAccount = config.telegraphAccount
  await setSharableOptions(options, config)
  return options
}

export const updateConfig = async (config: ConfigEntity): Promise<ConfigEntity> => {
  await putItem(TABLE_CONFIGS, config)
  return config
}

export const saveResult = async (result: BackupResult): Promise<void> => {
  const resultBatch: BackupEntity[] = []
  const stack = [result]
  while (stack.length > 0) {
    const item: BackupResult = stack.pop()
    const reposted: BackupKey[] = []
    for (const x of item.reposted) {
      const { sourceKey, id } = x
      stack.push(x)
      reposted.push({ sourceKey, id})
    }
    delete item.reposted
    const entity = item as unknown as BackupEntity
    entity.reposted = reposted
    resultBatch.push(entity)
  }
  await putBatch(TABLE_BACKUPS, resultBatch)
}

export const updateShareGroup = (id: string, creatorID: number, hashedPassword: string): Promise<void> =>
  putItem(TABLE_SHARE_GROUPS, { id, creatorID, password: hashedPassword })

export const getShareGroup = (id: string): Promise<ShareGroupEntity | undefined> =>
  getItem<ShareGroupEntity>(TABLE_SHARE_GROUPS, { id })

const getShareGroupConfigs = async (
  shareGroup: string
): Promise<ConfigEntity[]> => {
  const configs = await indexQuery<ConfigEntity>(
    TABLE_CONFIGS,
    SHARE_GROUP_INDEX,
    "shareGroup = :sg",
    { ":sg": shareGroup }
  )
  return shuffle(configs)
}

const setSharableOptions = async (
  options: Partial<BackupOptions>,
  config: ConfigEntity
): Promise<Partial<BackupOptions>> => {
  const groupConfigs = config.shareGroup === undefined
    ? [config]
    : await getShareGroupConfigs(config.shareGroup)
  const cookieJars: CookieJar[] = []
  for (const c of groupConfigs) {
    if (c.cookies !== undefined) {
      cookieJars.push(await CookieJar.deserialize(c.cookies))
    }
    if (c.awsS3 !== undefined && options.awsS3Settings === undefined) {
      options.awsS3Settings = c.awsS3
    }
  }
  options.getCookie = async (url) => {
    for (const cookieJar of cookieJars) {
      const cookie = await cookieJar.getCookieString(url)
      if (cookie) {
        return cookie
      }
    }
  }
  options.setCookie = async (url, cookie) => {
    for (const cookieJar of cookieJars) {
      if ((await cookieJar.getCookies(url)).length > 0) {
        await cookieJar.setCookie(cookie, url)
        return
      }
    }
  }
  return options
}