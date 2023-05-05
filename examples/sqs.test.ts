import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const client = new SQSClient({
  region: "eu-west-3",
  endpoint: `http://localhost:${LOCAL_PORT}/@sqs`,
});

const cmd = new SendMessageCommand({
  QueueUrl: "MyQueueName",
  MessageBody: JSON.stringify({
    hello: {
      message: "world",
      firstVisit: true,
    },
  }),
});

test("Single SQS", async () => {
  const res = await client.send(cmd);
  const handlerResponse = await sqsResponse(res.MessageId);
  expect(handlerResponse.success).toBe(true);
});
