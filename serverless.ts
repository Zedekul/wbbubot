import type { AWS } from "@serverless/typescript"

import main from "@functions/main"
import webhook from "@functions/webhook"
import {
  AWS_ACCOUNT_ID,
  BOT_DOCS_URL,
  BOT_TOKEN, BOT_USERNAME,
  PRODUCTION_MODE,
  S3_DEFAULT_ACCESS_POINT, S3_DEFAULT_BUCKET,
  SHARE_GROUP_INDEX, SQS_QUEUE_NAME,
  TABLE_BACKUPS, TABLE_CONFIGS, TABLE_SHARE_GROUPS, VIDEO_DEFAULT_THUMB
} from "@libs/config"

const DEFAULT_TELEGRAPH_ACCOUNT_TOKEN = process.env.DEFAULT_TELEGRAPH_ACCOUNT_TOKEN

if (
  AWS_ACCOUNT_ID === undefined ||
  BOT_TOKEN === undefined ||
  DEFAULT_TELEGRAPH_ACCOUNT_TOKEN === undefined ||
  VIDEO_DEFAULT_THUMB === undefined
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
      DEFAULT_TELEGRAPH_ACCOUNT_TOKEN,

      AWS_ACCOUNT_ID,
      BOT_TOKEN,
      VIDEO_DEFAULT_THUMB,

      TIMEOUT_TIME: process.env.TIMEOUT_TIME,
      SQS_QUEUE_NAME,
      TABLE_BACKUPS,
      TABLE_CONFIGS,
      TABLE_SHARE_GROUPS,
      S3_DEFAULT_BUCKET,
      S3_DEFAULT_ACCESS_POINT,

      BOT_DOCS_URL,
      BOT_USERNAME,

      PRODUCTION_MODE: PRODUCTION_MODE ? "1" : "0",
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NTBA_FIX_319: process.env.NTBA_FIX_319,
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
              "dynamodb:DeleteItem",
              "dynamodb:BatchWriteItem"
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
          FifoQueue: true,
          ContentBasedDeduplication: true,
          KmsDataKeyReusePeriodSeconds: 86400,
          KmsMasterKeyId: "alias/aws/sqs"
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
      S3BucketFiles: {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: "Retain",
        Properties: {
          BucketName: S3_DEFAULT_BUCKET,
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [
              { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }
            ]
          },
          AccessControl: "PublicRead"
        }
      },
      S3AccessPoint: {
        Type: "AWS::S3::AccessPoint",
        Properties: {
          Bucket: S3_DEFAULT_BUCKET,
          Name: S3_DEFAULT_ACCESS_POINT
        }
      }
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
