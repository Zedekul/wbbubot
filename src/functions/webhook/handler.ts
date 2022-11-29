import { SendMessageCommand, SendMessageCommandInput, SQSClient } from "@aws-sdk/client-sqs"
import { Update } from "node-telegram-bot-api"

import type { ValidatedEventAPIGatewayProxyEvent } from "@libs/apiGateway"
import { formatJSONResponse } from "@libs/apiGateway"
import { getUserID } from "@libs/botUtils"
import { AWS_REGION, SQS_QUEUE_URL } from "@libs/config"
import { middyfy } from "@libs/lambda"

import schema from "./schema"

const sendToSQS = async (update: Update): Promise<void> => {
  const sqs = new SQSClient({ region: AWS_REGION })
  const id = update.update_id.toString()
  const userID = getUserID(update).toString()
  const params: SendMessageCommandInput = {
    MessageBody: JSON.stringify(update),
    MessageDeduplicationId: id,
    MessageGroupId: userID === undefined ? id : userID,
    QueueUrl: SQS_QUEUE_URL,
  }
  const command = new SendMessageCommand(params)
  await sqs.send(command)
}

const webhook: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const update = event.body as unknown as Update
  try {
    await sendToSQS(update)
  } catch (e) {
    console.error(e)
  }
  return formatJSONResponse()
}

export const main = middyfy(webhook)
