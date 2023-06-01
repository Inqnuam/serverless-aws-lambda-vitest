import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "eu-west-3",
  endpoint: `http://127.0.0.1:${LOCAL_PORT}/@s3`,
});

const Bucket = "dummyBucket";
const Key = "some/file.json";

const putCmd = new PutObjectCommand({
  Bucket,
  Key,
  Body: JSON.stringify({ hello: "world" }),
  ContentType: "application/json",
  CacheControl: "max-age:6000",
});

test("test S3 handler response", async () => {
  const putResponse = await client.send(putCmd);
  const handlerResponse = await s3Response(putResponse.$metadata.requestId);
  console.log("handlerResponse", handlerResponse);
  expect(handlerResponse).toBeDefined();
});
