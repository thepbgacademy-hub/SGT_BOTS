import {
  runRenderReportJob,
  type RenderReportJobInput,
  type RenderReportJobResult,
  type RenderReportJobRunner,
} from "./jobs/render-report.job";

export function createInMemoryReportQueue(deps?: {
  onCompleted?: (result: RenderReportJobResult) => void;
  onFailed?: (input: { artifactId: string; message: string }) => void;
  runRenderReportJob?: RenderReportJobRunner;
}) {
  return {
    enqueueRenderReportJob(input: RenderReportJobInput) {
      setTimeout(() => {
        const runJob = deps?.runRenderReportJob ?? runRenderReportJob;

        void runJob(input)
          .then((result) => {
            deps?.onCompleted?.(result);
          })
          .catch((error) => {
            deps?.onFailed?.({
              artifactId: input.artifactId,
              message: (error as Error).message,
            });
          });
      }, 0);

      return {
        artifactId: input.artifactId,
        status: "queued" as const,
      };
    },
  };
}

export type {
  RenderReportJobInput,
  RenderReportJobResult,
  RenderReportJobRunner,
} from "./jobs/render-report.job";
