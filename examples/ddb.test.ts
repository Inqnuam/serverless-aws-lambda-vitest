import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000",
  region: "eu-west-3",
});

const TableName = "myTable";
const itemIdentifier = {
  id: {
    S: String(Math.random().toString().slice(4)),
  },
  age: {
    N: 24,
  },
};

const putCmd = new PutItemCommand({
  TableName,
  Item: {
    ...itemIdentifier,
    name: {
      S: "John",
    },
  },
});

test("DynamoDB Streams", async () => {
  await client.send(putCmd);
  const res = await dynamoResponse(itemIdentifier);
  expect(res.success).toBe(true);
});
