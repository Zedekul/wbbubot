import type { AWS } from "@serverless/typescript"

import main from "@functions/main"
import webhook from "@functions/webhook"
import {
  AWS_ACCOUNT_ID, AWS_REGION,
  BOT_TOKEN, PRODUCTION_MODE, SHARE_GROUP_INDEX, SQS_QUEUE_NAME,
  TABLE_BACKUPS, TABLE_CONFIGS, TABLE_SHARE_GROUPS
} from "@libs/config"

if (
  AWS_ACCOUNT_ID === undefined ||
  AWS_REGION === undefined ||
  BOT_TOKEN === undefined
) {
  throw new Error("envs should be initialized")
}

if (!SQS_QUEUE_NAME.endsWith(".fifo")) {
  throw new Error("SQS_QUEUE_NAME should end with .fifo")
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
      TABLE_CONFIGS,
      TABLE_BACKUPS,
      PRODUCTION_MODE: PRODUCTION_MODE ? "1" : "0",
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
            Action: [
              "dynamodb:Query",
              "dynamodb:Scan",
              "dynamodb:PutItem",
              "dynamodb:GetItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem"
            ],
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
  resources: {
    Resources: {
      SQSQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: SQS_QUEUE_NAME,
          FifoQueue: true
        }
      },
      BackupsDynamoDbTable: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Retain",
        Properties: {
          AttributeDefinitions: [
            { AttributeName: "sourceKey", AttributeType: "S" },
            { AttributeName: "id", AttributeType: "S" }
          ],
          KeySchema: [
            { AttributeName: "sourceKey", KeyType: "HASH" },
            { AttributeName: "id", KeyType: "RANGE" }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
          TableName: TABLE_BACKUPS
        }
      },
      ConfigsDynamoDbTable: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Retain",
        Properties: {
          AttributeDefinitions: [
            { AttributeName: "userID", AttributeType: "N" },
            { AttributeName: "shareGroup", AttributeType: "S" },
          ],
          KeySchema: [
            { AttributeName: "userID", KeyType: "HASH" }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
          TableName: TABLE_CONFIGS,
          GlobalSecondaryIndexes: [
            { 
              IndexName: SHARE_GROUP_INDEX,
              KeySchema: [
                { AttributeName: "shareGroup", KeyType: "HASH" },
              ],
              Projection: {
                ProjectionType: "ALL"
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
              }
            }
          ]
        }
      },
      ShareGroupsDynamoDbTable: {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: "Retain",
        Properties: {
          AttributeDefinitions: [
            { AttributeName: "id", AttributeType: "S" }
          ],
          KeySchema: [
            { AttributeName: "id", KeyType: "HASH" }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
          TableName: TABLE_SHARE_GROUPS
        }
      },
    }
  },
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
