import type { ParserData } from "@/types/parser";
import { createStore } from "@xstate/store";

export type SubmitState = "idle" | "submitting" | "success" | "error";

type ScrimCreatorContext = {
  mapData: ParserData | undefined;
  selectedFile: File | null;
  parsing: boolean;
  hasCorruptedData: boolean;
  submitState: SubmitState;
  errorCause: string;
  autoAssignTeamNames: boolean;
};

const initialContext: ScrimCreatorContext = {
  mapData: undefined,
  selectedFile: null,
  parsing: false,
  hasCorruptedData: false,
  submitState: "idle",
  errorCause: "",
  autoAssignTeamNames: false,
};

export const scrimCreatorStore = createStore({
  context: initialContext satisfies ScrimCreatorContext,
  on: {
    fileSelected: (context: ScrimCreatorContext, event: { file: File }) => ({
      ...context,
      selectedFile: event.file,
      parsing: true,
    }),

    fileCleared: (context: ScrimCreatorContext) => ({
      ...context,
      selectedFile: null,
      mapData: undefined,
      hasCorruptedData: false,
    }),

    parsingFinished: (
      context: ScrimCreatorContext,
      event: { mapData: ParserData; hasCorruption: boolean }
    ) => ({
      ...context,
      mapData: event.mapData,
      hasCorruptedData: event.hasCorruption,
      parsing: false,
    }),

    parsingFailed: (context: ScrimCreatorContext) => ({
      ...context,
      parsing: false,
    }),

    autoAssignChanged: (
      context: ScrimCreatorContext,
      event: { value: boolean }
    ) => ({
      ...context,
      autoAssignTeamNames: event.value,
    }),

    submitStarted: (context: ScrimCreatorContext) => ({
      ...context,
      submitState: "submitting" as const,
      errorCause: "",
    }),

    submitSucceeded: (context: ScrimCreatorContext) => ({
      ...context,
      submitState: "success" as const,
    }),

    submitFailed: (context: ScrimCreatorContext, event: { cause: string }) => ({
      ...context,
      submitState: "error" as const,
      errorCause: event.cause,
    }),

    backToForm: (context: ScrimCreatorContext) => ({
      ...context,
      submitState: "idle" as const,
      errorCause: "",
    }),

    reset: () => initialContext,
  },
});
