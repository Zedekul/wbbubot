import { config } from "dotenv"
config()

export const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID
export const AWS_REGION = process.env.AWS_REGION
export const BOT_TOKEN = process.env.BOT_TOKEN

export const SQS_QUEUE_NAME = process.env.SQS_QUEUE_NAME || "Wbbu.fifo"

export const SQS_QUEUE_URL = `https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/${SQS_QUEUE_NAME}`
