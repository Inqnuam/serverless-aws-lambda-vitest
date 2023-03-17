export const findReqMethod = (event: any) => {
  return event.httpMethod ?? event.requestContext?.http?.method;
};

export const handleInvoke = (lambda: any, event: any, info: any) => {
  if (info.kind == "alb" || info.kind == "apg") {
    const foundEndpoint = lambda[info.kind].find((x) => x.paths == info.paths);
    const method = findReqMethod(event);

    if (method) {
      if (method in foundEndpoint.methods) {
        foundEndpoint.methods[method] = true;
      } else if ("ANY" in foundEndpoint.methods) {
        foundEndpoint.methods.ANY = true;
      }
    }
  } else if (info.kind == "sns") {
    const foundSns = lambda.sns.find((x) => x.event == info.event);

    if (foundSns) {
      foundSns.done = true;
    }
  } else if (info.kind == "sqs") {
    const foundSqs = lambda.sqs.find((x) => x.event == info.event);

    if (foundSqs) {
      foundSqs.done = true;
    }
  } else if (info.kind == "ddb") {
    const foundDdb = lambda.ddb.find((x: any) => x.event == info.event);

    if (foundDdb) {
      foundDdb.done = true;
    }
  } else if (info.kind == "s3") {
    const foundDdb = lambda.s3.find((x: any) => x.event == info.event);

    if (foundDdb) {
      foundDdb.done = true;
    }
  }
};

export const calculateCoverage = (coverage: any) => {
  let total = 0;
  let done = 0;
  let result: any = {};
  for (const [lambdaName, v] of Object.entries(coverage)) {
    result[lambdaName] = {};

    const { alb, apg, s3, sns, sqs, ddb } = v as unknown as any;

    if (alb.length) {
      let albTotal = 0;
      let albSuccess = 0;
      alb.forEach((a) => {
        const values = Object.values(a.methods);
        albTotal += values.length;
        albSuccess += values.filter((x) => x === true).length;
      });
      total += albTotal;
      done += albSuccess;
      if (albTotal) {
        result[lambdaName].alb = {
          total: albTotal,
          done: albSuccess,
          endpoints: alb,
        };
      }
    }

    if (apg.length) {
      let apgTotal = 0;
      let apgSuccess = 0;

      apg.forEach((a) => {
        const values = Object.values(a.methods);

        apgTotal += values.length;
        apgSuccess += values.filter((x) => x === true).length;
      });

      total += apgTotal;
      done += apgSuccess;

      if (apgTotal) {
        result[lambdaName].apg = {
          total: apgTotal,
          done: apgSuccess,
          endpoints: apg,
        };
      }
    }

    if (sns.length) {
      result[lambdaName].sns = {
        total: sns.length,
        done: sns.filter((x) => x.done).length,
        events: sns,
      };
      total += result[lambdaName].sns.total;
      done += result[lambdaName].sns.done;
    }

    if (sqs.length) {
      result[lambdaName].sqs = {
        total: sqs.length,
        done: sqs.filter((x) => x.done).length,
        events: sqs,
      };
      total += result[lambdaName].sqs.total;
      done += result[lambdaName].sqs.done;
    }

    if (ddb.length) {
      result[lambdaName].ddb = {
        total: ddb.length,
        done: ddb.filter((x) => x.done).length,
        events: ddb,
      };
      total += result[lambdaName].ddb.total;
      done += result[lambdaName].ddb.done;
    }

    if (s3.length) {
      result[lambdaName].s3 = {
        total: s3.length,
        done: s3.filter((x) => x.done).length,
        events: s3,
      };
      total += result[lambdaName].s3.total;
      done += result[lambdaName].s3.done;
    }
  }

  return {
    total,
    done,
    coverage: Math.round((done / total) * 100),
    result,
  };
};
