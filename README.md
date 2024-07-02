## Description

> Vitest e2e Test for serverless-aws-lambda

### Requirements

- [serverless-aws-lambda](https://github.com/Inqnuam/serverless-aws-lambda)

# Installation

```bash
yarn add -D serverless-aws-lambda-vitest
# or
npm install -D serverless-aws-lambda-vitest
```

### Recommendations

Some recommendations to speed up Vitest e2e tests by avoiding double bundeling of your Lambdas by Vitest and serverless-aws-lambda.

- Use separate vitest config files for you Unit and e2e test, example:
  - `vitest.e2e.config.mts` (e2e Test)
  - `vitest.ut.config.mts` (Unit Test)
- Do not write your End-To-End Tests inside the same (sub) directory as your Lambda handlers
- Specify your e2e Test root directory inside your `vitest.e2e.config.mts`'s `include` and/or `exclude`.
- Set vitestPlugin at the end of your defineConfig plugins array.

## Usage

use [serverless-aws-lambda's](https://github.com/Inqnuam/serverless-aws-lambda) defineConfig to import this plugin

```js
// config.ts
import { defineConfig } from "serverless-aws-lambda/defineConfig";
import { vitestPlugin } from "serverless-aws-lambda-vitest";

const test = process.argv.includes("vitest");
const oneshot = process.argv.includes("run");

export default defineConfig({
  plugins: [
    test &&
      vitestPlugin({
        configFile: "./vitest.e2e.config.mts",
        oneshot,
        coverage: {
          outDir: "./coverage/",
          json: true,
          badge: true,
          threshold: 60,
        },
      }),
  ],
});
```

```ts
// vitest.e2e.config.mts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
  },
});
```

### Run tests and watch for changes

> make sure `"sls": "sls"` is defined in your package.json > `scripts`.

```bash
yarn sls aws-lambda -s dev vitest
# or
npm run sls -- aws-lambda -s dev vitest
```

### Run tests in CI

```bash
yarn sls aws-lambda -s dev vitest run
# or
npm run sls -- aws-lambda -s dev vitest run
```

### Testing async events

The plugin exposes multiple global functions to wait for Lambda handler async invokation responses.

- [sqsResponse](src/index.ts#L244)
- [snsResponse](src/index.ts#L250)
- [s3Response](src/index.ts#L256)
- [dynamoResponse](src/index.ts#L263)

Simple example of implementation for a SQS event:

```ts
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
```

see [more examples](examples).

### Coverage

Supported events

- Application Load Balancer (alb)
- API Gateway (http, httpApi)
- DynamoDB Streams
- S3
- SNS
- SQS

### Notes

- serverless-aws-lambda's `LOCAL_PORT` env variable is injected into process.env (also globally if option is enabled in vitest config) of your test files which could be used to make offline request against the local server.
- Set `oneshot` option to `true` to launch e2e Tests and exit the process after the first test sequence. Node Process will exit with `0` code, or `1` if Vitest tests fails or coverage threshold is not met.
  - It is also possible to delay exit process by passing `{delay: secondes}` to `oneshot`.
- use `coverage` option to generate coverage result json file and svg badge.
