import { AWSS3Settings } from "dedeleted"
import { config } from "dotenv"
config()

export const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID
export const AWS_REGION = process.env.AWS_REGION
export const BOT_TOKEN = process.env.BOT_TOKEN
export const VIDEO_DEFAULT_THUMB = process.env.VIDEO_DEFAULT_THUMB

export const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME || "Wbbu.fifo"
export const TABLE_BACKUPS = process.env.TABLE_BACKUPS || "wbbu-backups"
export const TABLE_CONFIGS = process.env.TABLE_CONFIGS || "wbbu-configs"
export const TABLE_SHARE_GROUPS = process.env.TABLE_SHARE_GROUPS || "wbbu-share-groups"
export const S3_DEFAULT_BUCKET = process.env.S3_DEFAULT_BUCKET || "wbbu-files"
export const S3_DEFAULT_ACCESS_POINT = process.env.S3_DEFAULT_ACCESS_POINT || "wbbu-files-default"

export const BOT_DOCS_URL = process.env.BOT_DOCS_URL || "https://zedekul.github.io/wbbubot/"
export const BOT_USERNAME = process.env.BOT_USERNAME || "wbbubot"

export const PRODUCTION_MODE = process.env.PRODUCTION_MODE === "1"

export const SHARE_GROUP_INDEX = "shareGroupIndex"
export const SQS_QUEUE_URL = `https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/${SQS_QUEUE_NAME}`

export const S3_DEFAULT: AWSS3Settings = {
  accessPoint: S3_DEFAULT_ACCESS_POINT,
  accountID: AWS_ACCOUNT_ID,
  bucket: S3_DEFAULT_BUCKET,
  region: AWS_REGION
}
