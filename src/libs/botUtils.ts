import { Update } from "node-telegram-bot-api"

export type UpdateType = Exclude<keyof Update, "update_id">

export const getUpdateType = (update: Update): UpdateType =>
  Object.keys(update).find(key => key !== "update_id") as UpdateType

export const getChatID = (update: Update): number | undefined =>{
  const key = getUpdateType(update)
  const v = update[key]
  if (v === undefined || !("from" in v)) {
    return undefined
  }
  return v.from === undefined ? undefined : v.from.id
}