import { EventEmitter } from "events";

export interface IReqEvent {
  id: string;
  lambdaName?: string;
}

export type supportedService = "sqs" | "sns" | "ddb"; //| "documentDb";
export type IRegisterdRequest = {
  [key in supportedService]: IReqEvent[];
};

export type IPendingRequests = {
  [key in supportedService]: { lambdaName: string; input: any; output?: any; error?: any }[];
};

export class TestRequestListener extends EventEmitter {
  registeredRequests: IRegisterdRequest = {
    sqs: [],
    sns: [],
    ddb: [],
    // documentDb: [],
  };
  pendingRequests: IPendingRequests = {
    sqs: [],
    sns: [],
    ddb: [],
    // documentDb: [],
  };
  support: Set<supportedService> = new Set(["sqs", "sns", "ddb"]);
  constructor() {
    super();
  }

  #pendingSqs = (id: string, lambdaName?: string) => {
    const foundIndex = this.pendingRequests.sqs.findIndex((x) => (lambdaName ? x.lambdaName == lambdaName : true && x.input.Records?.find((r) => r.messageId == id)));
    if (foundIndex != -1) {
      const foundReq = this.pendingRequests.sqs[foundIndex];
      this.pendingRequests.sqs.splice(foundIndex, 1);
      return foundReq;
    }
  };
  #pendingSns = (id: string, lambdaName?: string) => {
    const foundIndex = this.pendingRequests.sns.findIndex((x) => (lambdaName ? x.lambdaName == lambdaName : true && x.input.Records?.find((r) => r.Sns?.MessageId == id)));
    if (foundIndex != -1) {
      const foundReq = this.pendingRequests.sns[foundIndex];
      this.pendingRequests.sns.splice(foundIndex, 1);
      return foundReq;
    }
  };
  #pendingDdb = (id: string, lambdaName?: string) => {
    const foundIndex = this.pendingRequests.ddb.findIndex((x) =>
      lambdaName
        ? x.lambdaName == lambdaName
        : true &&
          x.input.Records?.find((r) => {
            let ddbId;
            try {
              ddbId = JSON.stringify(r.dynamodb?.Keys);
            } catch (error) {}

            return ddbId == id;
          })
    );

    if (foundIndex != -1) {
      const foundReq = this.pendingRequests.ddb[foundIndex];
      this.pendingRequests.ddb.splice(foundIndex, 1);
      return foundReq;
    }
  };
  getPendingRequest = (kind: supportedService, id: string, lambdaName?: string) => {
    switch (kind) {
      case "sqs":
        return this.#pendingSqs(id, lambdaName);
      case "sns":
        return this.#pendingSns(id, lambdaName);
      case "ddb":
        return this.#pendingDdb(id, lambdaName);
      default:
        break;
    }
  };

  #registeredSqs = (lambdaName: string, input: any) => {
    const foundIndex = this.registeredRequests.sqs.findIndex((x: IReqEvent) => (x.lambdaName ? x.lambdaName == lambdaName : true && input.Records?.find((r) => r.messageId == x.id)));

    if (foundIndex != -1) {
      const id = this.registeredRequests.sqs[foundIndex].id;
      this.registeredRequests.sqs.splice(foundIndex, 1);

      return id;
    }
  };
  #registeredSns = (lambdaName: string, input: any) => {
    const foundIndex = this.registeredRequests.sns.findIndex((x: IReqEvent) => (x.lambdaName ? x.lambdaName == lambdaName : true && input.Records?.find((r) => r.Sns?.MessageId == x.id)));

    if (foundIndex != -1) {
      const id = this.registeredRequests.sns[foundIndex].id;
      this.registeredRequests.sns.splice(foundIndex, 1);

      return id;
    }
  };

  #registeredDdb = (lambdaName: string, input: any) => {
    const foundIndex = this.registeredRequests.ddb.findIndex((x: IReqEvent) =>
      x.lambdaName
        ? x.lambdaName == lambdaName
        : true &&
          input.Records?.find((r) => {
            let id;
            try {
              id = JSON.stringify(r.dynamodb?.Keys);
            } catch (error) {}

            return id == x.id;
          })
    );

    if (foundIndex != -1) {
      const id = this.registeredRequests.ddb[foundIndex].id;
      this.registeredRequests.ddb.splice(foundIndex, 1);

      return id;
    }
  };
  #getRegisteredRequest = (kind: supportedService, lambdaName: string, input: any): string | undefined => {
    switch (kind) {
      case "sqs":
        return this.#registeredSqs(lambdaName, input);
      case "sns":
        return this.#registeredSns(lambdaName, input);
      case "ddb":
        return this.#registeredDdb(lambdaName, input);
      default:
        break;
    }
  };
  registerRequest = (kind: supportedService, id: string, lambdaName?: string) => {
    this.registeredRequests[kind].push({ id, lambdaName });
  };

  handleInvokeResponse = (kind: supportedService, lambdaName: string, input: any, output: any, success: boolean) => {
    const id = this.#getRegisteredRequest(kind, lambdaName, input);

    if (id) {
      this.emit(id, success, output, lambdaName);
    } else {
      const pendingRequest = {
        input,
        [success ? "output" : "error"]: output,
        lambdaName: lambdaName,
      };

      this.pendingRequests[kind].push(pendingRequest);
    }
  };
}
