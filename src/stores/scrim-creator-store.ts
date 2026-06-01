import { createStore } from "@xstate/store";

export type SubmitState = "idle" | "submitting" | "success" | "error";

type ScrimCreatorContext = {
  submitState: SubmitState;
  autoAssignTeamNames: boolean;
};

const initialContext: ScrimCreatorContext = {
  submitState: "idle",
  autoAssignTeamNames: false,
};

export const scrimCreatorStore = createStore({
  context: initialContext satisfies ScrimCreatorContext,
  on: {
    autoAssignChanged: (
      context: ScrimCreatorContext,
      event: { value: boolean }
    ) => ({
      ...context,
      autoAssignTeamNames: event.value,
    }),

    submitSucceeded: (context: ScrimCreatorContext) => ({
      ...context,
      submitState: "success" as const,
    }),

    reset: () => initialContext,
  },
});
