import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { accessSync, mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import { calculateCoverage, handleInvoke } from "./utils";
import { generateBadge } from "./badge";
import { TestRequestListener } from "./requestListener";
import { startVitest, createVitest, type Vitest, UserConfig } from "vitest/node";
import type { supportedService } from "./requestListener";
import os from "os";

// @ts-ignore
import { actualDirName } from "resolvedPaths";

const setupFile = `${actualDirName.slice(0, -5)}/resources/setup.ts`;

let vite: Vitest;

interface IVitestPlugin {
  configFile: string;
  oneshot?:
    | boolean
    | {
        /**
         * delay process exit (in seconds)
         *
         * Usefull to wait for async events to process
         */
        delay: number;
      };
  coverage?: {
    outDir: string;
    json?: boolean;
    badge?: boolean;
    threshold?: number;
    /**
     * Clean coverage results before running tests
     * @default true
     */
    clean?: boolean;
  };
}

const coverage: any = {};
const vitestPlugin = (options: IVitestPlugin) => {
  let isWatching: boolean = false;
  const eventListener = new TestRequestListener();

  let coverageOutDir: string | undefined = undefined;
  if (options.coverage) {
    if (options.coverage.outDir) {
      coverageOutDir = path.resolve(options.coverage.outDir);
    } else {
      console.warn("coverage 'outDir' is required");
    }
  }

  const config: SlsAwsLambdaPlugin = {
    name: "vitest-plugin",
    onInit: function () {
      if (coverageOutDir) {
        try {
          accessSync(coverageOutDir);

          if (options.coverage.clean == true || options.coverage.clean == undefined) {
            rmSync(coverageOutDir, { recursive: true, force: true });
            mkdirSync(coverageOutDir, { recursive: true });
          }
        } catch (error) {
          mkdirSync(coverageOutDir, { recursive: true });
        }

        // this is useless but "NODE_V8_COVERAGE" env is required on main thread to make Workers threads produce coverage
        // https://github.com/nodejs/node/issues/46378
        process.env.NODE_V8_COVERAGE = os.tmpdir();
      }

      this.lambdas.forEach((l) => {
        if (coverageOutDir) {
          l.setEnv("NODE_V8_COVERAGE", coverageOutDir);
        }

        const lambdaConverage = {
          done: false,
          coverage: 0,
          alb: [],
          apg: [],
          s3: [],
          sns: [],
          sqs: [],
          ddb: [],
          documentDb: [],
        };

        l.endpoints.forEach((e) => {
          let c: any = {
            paths: e.paths,
            methods: {},
          };
          e.methods.forEach((m) => {
            c.methods[m] = false;
          });
          lambdaConverage[e.kind].push(c);
        });

        l.sns.forEach((sns) => {
          lambdaConverage.sns.push({
            done: false,
            event: sns,
          });
        });

        l.sqs.forEach((sqs) => {
          lambdaConverage.sqs.push({
            done: false,
            event: sqs,
          });
        });

        l.ddb.forEach((ddb) => {
          lambdaConverage.ddb.push({
            done: false,
            event: ddb,
          });
        });
        l.s3.forEach((s3) => {
          lambdaConverage.s3.push({
            done: false,
            event: s3,
          });
        });

        // TODO: add documentDb and FunctionURL
        coverage[l.name] = lambdaConverage;

        l.onInvoke((event: any, info: any) => {
          if (!event || !info) {
            return;
          }
          handleInvoke(coverage[l.name], event, info);
        });

        l.onInvokeSuccess((input, output, info) => {
          // TODO if kind is dynamo or document db get table name and collection name
          if (input && typeof input == "object" && info) {
            const kind: supportedService = info.kind;
            if (eventListener.support.has(kind)) {
              eventListener.handleInvokeResponse(kind, l.name, input, output, true);
            }
          }
        });

        l.onInvokeError((input, error, info) => {
          if (input && typeof input == "object" && info) {
            const kind: supportedService = info.kind;
            if (eventListener.support.has(kind)) {
              eventListener.handleInvokeResponse(kind, l.name, input, error, false);
            }
          }
        });
      });
    },
    onExit: function (code) {
      if (coverageOutDir) {
        const threshold = options.coverage.threshold;
        const coverageResult = calculateCoverage(coverage);

        if (threshold && code == 0 && coverageResult.coverage < threshold) {
          process.exitCode = 1;
          console.log(`Covered events: ${coverageResult.coverage}%\nThreshold: ${threshold}%`);
        }

        if (options.coverage.json) {
          writeFileSync(path.join(coverageOutDir, "vitest-events-coverage.json"), JSON.stringify(coverageResult, null, 2), { encoding: "utf-8" });
        }
        if (options.coverage.badge) {
          writeFileSync(path.join(coverageOutDir, "vitest-events-coverage.svg"), generateBadge(coverageResult.coverage), { encoding: "utf-8" });
        }
      }
    },
    offline: {
      request: [
        {
          filter: "/__vitest_plugin/",
          callback: async function (req, res) {
            const { searchParams } = new URL(req.url, "http://localhost:3000");

            const kind = searchParams.get("kind") as supportedService;
            const id = searchParams.get("id");
            const lambdaName = searchParams.get("lambdaName");

            const listener = (success: boolean, output: any, foundLambdaName: string) => {
              if (!success) {
                res.statusCode = 400;
              }

              if (!lambdaName || lambdaName == foundLambdaName) {
                eventListener.removeListener(id, listener);
                res.end(output ? JSON.stringify(output) : undefined);
              }
            };
            eventListener.on(id, listener);

            const foundEvent = eventListener.getPendingRequest(kind, id, lambdaName);
            if (foundEvent) {
              eventListener.removeListener(id, listener);
              const output = foundEvent.error ?? foundEvent.output;
              if (foundEvent.error) {
                res.statusCode = 400;
              }
              res.end(output ? JSON.stringify(output) : undefined);
            } else {
              eventListener.registerRequest(kind, id, lambdaName);
            }
          },
        },
      ],
      onReady: async function (port) {
        if (!options?.configFile) {
          throw new Error("Vitest config file path is required");
        }

        const watch = !options.oneshot ? true : false;
        const userConfig: UserConfig = {
          config: options.configFile,
        };

        const overrideConfig: { define: Record<string, any>; test: UserConfig } = {
          define: {
            LOCAL_PORT: port,
          },
          test: {
            watch,
            environment: "node",
            isolate: true,
            pool: "forks",
            coverage: {
              enabled: false,
              provider: "v8",
            },
            setupFiles: [setupFile],
            env: {
              LOCAL_PORT: String(port),
            },
          },
        };

        const startTestRunner = async () => {
          try {
            if (!watch) {
              vite = await createVitest("test", userConfig, overrideConfig);
              await vite.start();
            } else {
              vite = await startVitest("test", [], userConfig, overrideConfig);
            }
          } catch (error) {
            console.error(error);
            process.exit(1);
          }
          isWatching = vite.config.watch;

          if (options.oneshot) {
            let timeout = 0;

            if (typeof options.oneshot == "object" && options.oneshot.delay) {
              timeout = options.oneshot.delay * 1000;
            }

            await new Promise((resolve) => setTimeout(resolve, timeout));
            try {
              await this.stop();
              await vite.exit();
            } catch (error) {
              console.error(error);
              process.exit();
            } finally {
              process.exit();
            }
          }
        };

        const ddbPlugin = this.options.plugins?.find((x: SlsAwsLambdaPlugin) => x.name == "ddblocal-stream") as SlsAwsLambdaPlugin;

        if (ddbPlugin && !ddbPlugin.pluginData.isReady) {
          console.log("Waiting for DynamoDB Local Streams plugin to initialize...");
          ddbPlugin.pluginData.onReady(startTestRunner);
        } else {
          await startTestRunner();
        }
      },
    },
    buildCallback: async function (result, isRebuild) {
      if (isWatching && isRebuild) {
        vite.rerunFiles();
      }
    },
  };

  return config;
};

declare global {
  /**
   * @param {string} messageId MessageId returned by AWS SDK SQS Client's `SendMessageCommand` or from `SendMessageBatchCommand`'s Success MessageId.
   * @param {string} lambdaName consumer name if SQS will be consumed by multiple Lambdas.
   */
  const sqsResponse: (messageId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {string} messageId MessageId returned by AWS SDK SNS Client's `PublishCommand` or from `PublishBatchCommand`'s Success MessageId.
   * @param {string} lambdaName consumer name if SNS will be consumed by multiple Lambdas.
   */
  const snsResponse: (messageId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {string} requestId requestId returned by AWS SDK S3 Client's send() response `$metadata`.
   * @param {string} lambdaName consumer name if S3 event will be consumed by multiple Lambdas.
   */
  const s3Response: (requestId: string, lambdaName?: string) => Promise<any>;

  /**
   * @param {any} identifier DynamoDB Item identifier.
   * Example: {id:{N: 12}}.
   * @param {string} lambdaName consumer name if Stream will be consumed by multiple Lambdas.
   */
  const dynamoResponse: (identifier: { [key: string]: any }, lambdaName?: string) => Promise<any>;
  /**
   * serverless-aws-lambda local server port
   */
  const LOCAL_PORT: number;
}

export default vitestPlugin;

export { vitestPlugin };
