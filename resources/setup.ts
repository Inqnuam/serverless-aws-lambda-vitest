import http from "http";

const SERVER_URL = `http://localhost:${process.env.LOCAL_PORT}/__vitest_plugin`;

async function __vitest_req(query: string) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}?${query}`, (res) => {
      let data: Buffer;

      res.on("data", (chunk) => {
        data = typeof data == "undefined" ? chunk : Buffer.concat([data, chunk]);
      });

      res.on("end", () => {
        const returnResponse = res.statusCode == 200 ? resolve : reject;
        let content;

        try {
          if (data) {
            content = data.toString();
            content = JSON.parse(content);
          }
        } catch (error) {}
        returnResponse(content);
      });
    });
  });
}

global.sqsResponse = async (id: string, lambdaName?: string) => {
  let query = `kind=sqs&id=${id}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }
  return __vitest_req(query);
};

global.snsResponse = async (id: string, lambdaName?: string) => {
  let query = `kind=sns&id=${id}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }

  return __vitest_req(query);
};

global.dynamoResponse = async (identifier: { [key: string]: any }, lambdaName?: string) => {
  let sortedKeys = {};
  Object.keys(identifier)
    .sort()
    .forEach((x) => {
      const value = identifier[x];
      const attribType = Object.keys(value)[0];

      if (typeof value[attribType] != "string") {
        value[attribType] = String(value[attribType]);
      }
      sortedKeys[x] = value;
    });

  let query = `kind=ddb&id=${JSON.stringify(sortedKeys)}`;
  if (lambdaName) {
    query += `&lambdaName=${lambdaName}`;
  }

  return __vitest_req(query);
};
