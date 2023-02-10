import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
import { accessSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { calculateCoverage, handleInvoke } from "./utils";
import { generateBadge } from "./badge";
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

        coverage[l.name] = lambdaConverage;

        // @ts-ignore
        l.onInvoke((event: any, info: any) => {
          if (!event || !info) {
            return;
          }
          handleInvoke(coverage[l.name], event, info);
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
      onReady: async function (port) {
        if (!options?.configFile) {
          throw new Error("Vitest config file path is required");
        }
        const { startVitest } = await import(`file://${process.cwd()}/node_modules/vitest/dist/node.js`);
        vite = await startVitest(
          "test",
          [],
          {
            config: options.configFile,
          },
          {
            test: {
              watch: true,
              watchExclude: [".aws_lambda", "src", "serverless.yml", "node_modules", ".git"],
              env: {
                LOCAL_PORT: String(port),
              },
            },
          }
        );

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
      if (isRebuild) {
        vite.rerunFiles();
      }
    },
  };

  return config;
};

export default vitestPlugin;

export { vitestPlugin };
