## Description

> Vitest TI for serverless-aws-lambda

# Installation

```bash
yarn add -D serverless-aws-lambda-jest
# or
npm install -D serverless-aws-lambda-jest
```

## Usage

use [serverless-aws-lambda's](https://github.com/Inqnuam/serverless-aws-lambda) defineConfig to import this plugin

```js
// config.js
const { defineConfig } = require("serverless-aws-lambda/defineConfig");
const { vitestPlugin } = require("serverless-aws-lambda-vitest");

module.exports = defineConfig({
  plugins: [vitestPlugin({ configFile: "./vitest.config.js" })],
});
```
