## Description

> Vitest Integration Test for serverless-aws-lambda

### Requirements

- [serverless-aws-lambda](https://github.com/Inqnuam/serverless-aws-lambda)
- Vitest (must be installed inside your node_modules)

# Installation

```bash
yarn add -D serverless-aws-lambda-vitest
# or
npm install -D serverless-aws-lambda-vitest
```

### Recommendations

Some recommendations to speed up Vitest integration tests by avoiding double bundeling of your Lambdas by Vitest and serverless-aws-lambda.

- Use separate vitest config files for you Unit and Integration test, example:
  - `vitest.it.config.js` (Integration Test)
  - `vitest.ut.config.js` (Unit Test)
- Do not write your Integration Tests inside the same (sub) directory as your Lambda handlers
- Specify your Integrations Test root directory inside your `vitest.it.config.js`'s `include` and/or `exclude`.
- Set vitestPlugin at the end of your defineConfig plugins array.

## Usage

use [serverless-aws-lambda's](https://github.com/Inqnuam/serverless-aws-lambda) defineConfig to import this plugin

```js
// config.js
const { defineConfig } = require("serverless-aws-lambda/defineConfig");
const { vitestPlugin } = require("serverless-aws-lambda-vitest");

module.exports = defineConfig({
  plugins: [
    vitestPlugin({
      configFile: "./vitest.it.config.js",
      oneshot: false,
      coverage: {
        outDir: "./coverage/",
        json: true,
        badge: true,
      },
    }),
  ],
});
```

### Coverage

Supported events

- Application Load Balancer (alb)
- API Gateway (http, httpApi)
- DynamoDB Streams
- S3
- SNS
- SQS

### Notes

- serverless-aws-lambda's `LOCAL_PORT` env variable is injected into process.env of your test files which could be used to make offline request against the local server.
- Set `oneshot` option to `true` to launch Integrations Tests and exit the process after the first test sequence. Node Process will exit with `0` code, or `1` if Vitest tests fails.
  - It is also possible to delay exit process by passing `{delay: secondes}` to `oneshot`.
- use `coverage` option to generate coverage result json file and svg badge.
