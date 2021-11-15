import type { AWS } from "@serverless/typescript"

import main from "@functions/main"
import webhook from "@functions/webhook"
import { AWS_ACCOUNT_ID, AWS_REGION, BOT_TOKEN, SQS_QUEUE_NAME } from "@libs/config"

if (
  AWS_ACCOUNT_ID === undefined ||
  AWS_REGION === undefined ||
  BOT_TOKEN === undefined
) {
  throw new Error("envs should be initialized")
}
const serverlessConfiguration: AWS = {
  service: "wbbu",
  frameworkVersion: "2",
  plugins: ["serverless-esbuild"],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_ACCOUNT_ID,
      BOT_TOKEN,
      SQS_QUEUE_NAME,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
    iam: {
      role: {
        name: "wbbu-serverless-role",
        statements: [
          {
            Effect: "Allow",
            Action: ["sqs:SendMessage", "sqs:ReceiveMessage"],
            Resource: `arn:aws:sqs:*:*:${SQS_QUEUE_NAME}`,
          },
          {
            Effect: "Allow",
            Action: ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem"],
            Resource: "arn:aws:dynamodb:*:*:table/wbbu-*",
          }
        ]
      }
    },
    lambdaHashingVersion: "20201221",
  },
  // import the function via paths
  functions: {
    main,
    webhook
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
  },
}

module.exports = serverlessConfiguration
