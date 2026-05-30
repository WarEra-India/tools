import { runFullOptimization, type OptimizeConfig, type OptimizerResult } from "./optimizer-core";

export interface WorkerRequest {
  type: "optimize";
  config: OptimizeConfig;
}

export interface WorkerProgressMessage {
  type: "progress";
  phase: string;
  current: number;
  total: number;
}

export interface WorkerResultMessage {
  type: "result";
  result: OptimizerResult;
}

export type WorkerMessage = WorkerProgressMessage | WorkerResultMessage;

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type === "optimize") {
    const result = runFullOptimization(
      e.data.config,
      (phase, current, total) => {
        (self as unknown as Worker).postMessage({
          type: "progress", phase, current, total,
        } satisfies WorkerProgressMessage);
      },
    );
    (self as unknown as Worker).postMessage({
      type: "result", result,
    } satisfies WorkerResultMessage);
  }
};
