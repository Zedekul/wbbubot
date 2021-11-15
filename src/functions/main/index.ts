import { handlerPath } from "@libs/handlerResolver"
import { AWS_ACCOUNT_ID, AWS_REGION, SQS_QUEUE_NAME } from "@libs/config"

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [{
    sqs: `arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT_ID}:${SQS_QUEUE_NAME}`
  }]
}
