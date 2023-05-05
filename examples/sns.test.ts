import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const client = new SNSClient({
  region: "eu-west-3",
  endpoint: `http://localhost:${LOCAL_PORT}/@sns/`,
});

const msg = {
  pet: "cat",
  hobbies: {
    eat: true,
    sleep: true,
  },
};

const cmd = new PublishCommand({
  TopicArn: "arn:aws:sns:eu-west-3:140838172632:MyTopic",
  Message: JSON.stringify({
    default: JSON.stringify(msg),
  }),
  MessageStructure: "json",
  MessageAttributes: {
    someName: {
      DataType: "String",
      StringValue: "some value",
    },
  },
});

test("Single SNS", async () => {
  const res = await client.send(cmd);
  const handlerResponse = await snsResponse(res.MessageId);
  expect(handlerResponse.success).toBe(true);
});
