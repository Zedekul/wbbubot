import {
  BatchWriteItemCommand,
  BatchWriteItemInput,
  DynamoDBClient,
  GetItemCommand, GetItemCommandInput,
  PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput
} from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

import { AWS_REGION } from "./config"

export type Keys = { [key: string]: string | number }

export const getItem = async <T>(tableName: string, keys: Keys): Promise<T | undefined> => {
  const client = new DynamoDBClient({ region: AWS_REGION })
  const params: GetItemCommandInput = {
    TableName: tableName,
    Key: marshall(keys)
  }
  const { Item } = await client.send(new GetItemCommand(params))
  return Item === undefined
    ? undefined
    : unmarshall(Item) as T
}

export const indexQuery = async <T>(
  tableName: string,
  indexName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Keys
): Promise<T[]> => {
  const client = new DynamoDBClient({ region: AWS_REGION })
  const params: QueryCommandInput = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues)
  }
  const { Items } = await client.send(new QueryCommand(params))
  return Items.map(x => unmarshall(x) as T)
}


export const putItem = async <T>(tableName: string, item: T): Promise<void> => {
  const client = new DynamoDBClient({ region: AWS_REGION })
  const params: PutItemCommandInput = {
    TableName: tableName,
    Item: marshall(item),
  }
  await client.send(new PutItemCommand(params))
}

export const putBatch = async <T>(tableName: string, items: T[]): Promise<void> => {
  const client = new DynamoDBClient({ region: AWS_REGION })
  const params: BatchWriteItemInput = {
    RequestItems: {
      [tableName]: items.map(x => ({
        PutRequest: {
          Item: marshall(x)
        }
      }))
    }
  }
  await client.send(new BatchWriteItemCommand(params))
}
