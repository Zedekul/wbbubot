import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs"
import { Update } from "node-telegram-bot-api"

import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/apiGateway"
import { formatJSONResponse } from "@libs/apiGateway"
import { getUserID } from "@libs/botUtils"
import { AWS_REGION, SQS_QUEUE_URL } from "@libs/config"
import { middyfy } from "@libs/lambda"

import schema from "./schema"


const sendToSQS = async (update: Update) => {
  const sqs = new SQSClient({ region: AWS_REGION })
  const id = update.update_id.toString()
  const userID = getUserID(update).toString()
  const command = new SendMessageCommand({
    MessageBody: JSON.stringify(update),
    MessageDeduplicationId: id,
    MessageGroupId: userID === undefined ? id : userID,
    QueueUrl: SQS_QUEUE_URL
  })
  try {
    sqs.send(command)
  } catch (error) {
    console.error(error)
  }
}

const webhook: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event, handler, callback) => {
  const update = event.body as unknown as Update
  sendToSQS(update)
  return formatJSONResponse()
}

export const main = middyfy(webhook)
