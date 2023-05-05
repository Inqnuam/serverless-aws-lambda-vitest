import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { accessSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { calculateCoverage, handleInvoke } from "./utils";
import { generateBadge } from "./badge";
import { TestRequestListener } from "./requestListener";
import type { supportedService } from "./requestListener";

// @ts-ignore
import { actualDirName, vitestPath } from "resolvedPaths";
const setupFile = `${actualDirName.slice(0, -5)}/resources/setup.ts`;

let vite;

interface IVitestPlugin {
  configFile: string;
  oneshot?: boolean | { delay: number };
  coverage?: {
    outDir: string;
    json?: boolean;
    badge?: boolean;
  };
}

const coverage: any = {};
const vitestPlugin = (options: IVitestPlugin) => {
  let isWatching: boolean = false;
  const eventListener = new TestRequestListener();

  const config: SlsAwsLambdaPlugin = {
    name: "vitest-plugin",
    onInit: function () {
      this.lambdas.forEach((l) => {
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
      if (options.coverage) {
        if (options.coverage.outDir) {
          const coverageResult = calculateCoverage(coverage);

          const outdir = path.resolve(options.coverage.outDir);

          try {
            accessSync(outdir);
          } catch (error) {
            mkdirSync(outdir, { recursive: true });
          }

          if (options.coverage.json) {
            writeFileSync(`${outdir}/vitest-it-coverage.json`, JSON.stringify(coverageResult), { encoding: "utf-8" });
          }
          if (options.coverage.badge) {
            writeFileSync(`${outdir}/vitest-it-coverage.svg`, generateBadge(coverageResult.coverage), { encoding: "utf-8" });
          }
        } else {
          console.log("coverage 'outDir' is required");
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

        const { startVitest } = await import(`file://${vitestPath}`);
        vite = await startVitest(
          "test",
          [],
          {
            config: options.configFile,
          },
          {
            define: {
              LOCAL_PORT: port,
            },
            test: {
              watchExclude: [".aws_lambda", "src", "serverless.yml", "node_modules", ".git"],
              setupFiles: [setupFile],
              env: {
                LOCAL_PORT: String(port),
              },
            },
          }
        );

        isWatching = vite.config.watch;

        if (options.oneshot) {
          let timeout = 0;

          if (typeof options.oneshot == "object" && options.oneshot.delay) {
            timeout = options.oneshot.delay * 1000;
          }

          setTimeout(() => {
            this.stop();
            process.exit();
          }, timeout);
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
   * @param {any} identifier DynamoDB Item identifier.
   * Example: {id:{N: 12}}.
   * @param {string} lambdaName consumer name if SNS will be consumed by multiple Lambdas.
   */
  const dynamoResponse: (identifier: { [key: string]: any }, lambdaName?: string) => Promise<any>;
  /**
   * serverless-aws-lambda local server port
   */
  const LOCAL_PORT: number;
}

export default vitestPlugin;

export { vitestPlugin };
