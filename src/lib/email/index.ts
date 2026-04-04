import { EffectObservabilityLive } from "@/instrumentation";
import type { SendEmailResponse } from "@aws-sdk/client-ses";
import {
  SendEmailCommand,
  type SendEmailRequest,
  SES,
} from "@aws-sdk/client-ses";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import {
  Config,
  Context,
  Effect,
  Layer,
  ManagedRuntime,
  Metric,
  Schema as S,
  Schedule,
} from "effect";
import { EmailSendError, RateLimitError, ValidationError } from "./errors";
import { emailErrorTotal, emailSendDuration, emailSentTotal } from "./metrics";
import { type EmailArgs, EmailArgsSchema } from "./types";

export type AwsConfig = {
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
};

export class AwsConfigService extends Context.Tag(
  "@app/email/AwsConfigService"
)<AwsConfigService, AwsConfig>() {}

export const AwsConfigLive = Layer.effect(
  AwsConfigService,
  Effect.gen(function* () {
    const region = yield* Config.string("AWS_SES_REGION").pipe(
      Config.withDefault("us-east-1")
    );
    const accessKeyId = yield* Config.string("AWS_ACCESS_KEY_ID");
    const secretAccessKey = yield* Config.string("AWS_SECRET_ACCESS_KEY");

    return { region, accessKeyId, secretAccessKey } satisfies AwsConfig;
  })
);

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

export type EmailServiceInterface = {
  readonly sendEmail: (
    args: EmailArgs
  ) => Effect.Effect<
    SendEmailResponse,
    ValidationError | RateLimitError | EmailSendError
  >;
};

export class EmailService extends Context.Tag("@app/email/EmailService")<
  EmailService,
  EmailServiceInterface
>() {}

function isTransientError(
  error: ValidationError | RateLimitError | EmailSendError
): boolean {
  if (error._tag !== "EmailSendError") return false;

  const cause = error.cause;
  if (!cause || typeof cause !== "object") return false;

  const fault = "$fault" in cause ? cause.$fault : undefined;
  const name = "name" in cause ? String(cause.name) : "";

  return fault === "server" || name === "TooManyRequestsException";
}

export const make: Effect.Effect<
  EmailServiceInterface,
  never,
  AwsConfigService
> = Effect.gen(function* () {
  const config = yield* AwsConfigService;

  const sesClient = new SES({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    sendEmail: (args: EmailArgs) => {
      const startTime = Date.now();
      const wideEvent: Record<string, unknown> = {
        to: args.to,
        subject: args.subject,
      };

      return Effect.gen(function* () {
        const validatedArgs = yield* S.decodeUnknown(EmailArgsSchema)(
          args
        ).pipe(
          Effect.mapError(
            (parseError) =>
              new ValidationError({
                field: "email_args",
                message: `Invalid email arguments: ${parseError.message}`,
              })
          ),
          Effect.withSpan("email.validate-args", {
            attributes: { to: args.to, subject: args.subject },
          })
        );

        const {
          to,
          from = "noreply@lux.dev",
          subject,
          html,
          replyTo,
          ccAddresses,
          bccAddresses,
        } = validatedArgs;

        wideEvent.from = from;
        wideEvent.has_reply_to = !!replyTo;
        wideEvent.cc_count = ccAddresses?.length ?? 0;
        wideEvent.bcc_count = bccAddresses?.length ?? 0;

        const rateLimitResult = yield* Effect.tryPromise({
          try: () => ratelimit.limit(to),
          catch: (error) =>
            new RateLimitError({
              identifier: to,
              message: `Rate limit error: ${String(error)}`,
            }),
        }).pipe(
          Effect.withSpan("email.rate-limit-check", {
            attributes: { to },
          })
        );

        if (!rateLimitResult.success) {
          return yield* new RateLimitError({
            identifier: to,
            message: `Rate limit exceeded. Try again after ${new Date(rateLimitResult.reset).toISOString()}`,
          });
        }

        wideEvent.rate_limit_remaining = rateLimitResult.remaining;

        const emailParams: SendEmailRequest = {
          Source: `lux.dev <${from}>`,
          Destination: {
            ToAddresses: [to],
            CcAddresses: ccAddresses ? [...ccAddresses] : undefined,
            BccAddresses: bccAddresses ? [...bccAddresses] : undefined,
          },
          Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: html } },
          },
          ReplyToAddresses: replyTo ? [...replyTo] : undefined,
        };

        const result = yield* Effect.tryPromise({
          try: () => sesClient.send(new SendEmailCommand(emailParams)),
          catch: (error) =>
            new EmailSendError({
              recipient: to,
              operation: `send email with subject: ${subject}`,
              cause: error,
            }),
        }).pipe(
          Effect.retry({
            schedule: Schedule.exponential(1000).pipe(
              Schedule.jittered,
              Schedule.compose(Schedule.recurs(2))
            ),
            while: isTransientError,
          }),
          Effect.withSpan("email.send", {
            attributes: {
              to,
              from,
              subject,
              hasReplyTo: !!replyTo,
              ccCount: ccAddresses?.length ?? 0,
              bccCount: bccAddresses?.length ?? 0,
            },
          })
        );

        wideEvent.message_id = result.MessageId;
        wideEvent.outcome = "success";

        yield* Metric.increment(emailSentTotal);

        return result;
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            wideEvent.outcome = "error";
            wideEvent.error_tag = error._tag;
            wideEvent.error_message = error.message;
          }).pipe(Effect.andThen(Metric.increment(emailErrorTotal)))
        ),
        Effect.ensuring(
          Effect.suspend(() => {
            const durationMs = Date.now() - startTime;
            wideEvent.duration_ms = durationMs;
            wideEvent.outcome ??= "interrupted";
            const log =
              wideEvent.outcome === "error"
                ? Effect.logError("email.sendEmail")
                : Effect.logInfo("email.sendEmail");
            return log.pipe(
              Effect.annotateLogs(wideEvent),
              Effect.andThen(emailSendDuration(Effect.succeed(durationMs)))
            );
          })
        ),
        Effect.withSpan("email.sendEmail", {
          attributes: { to: args.to, subject: args.subject },
        })
      );
    },
  } satisfies EmailServiceInterface;
});

export const EmailServiceLive = Layer.effect(EmailService, make).pipe(
  Layer.provide(AwsConfigLive),
  Layer.provide(EffectObservabilityLive)
);

export function sendEmail(
  args: EmailArgs
): Effect.Effect<
  SendEmailResponse,
  ValidationError | RateLimitError | EmailSendError,
  EmailService
> {
  return Effect.flatMap(EmailService, (service) => service.sendEmail(args));
}

export const emailRuntime = ManagedRuntime.make(EmailServiceLive);

export const email = {
  sendEmail: (args: EmailArgs) =>
    emailRuntime.runPromise(
      EmailService.pipe(Effect.flatMap((service) => service.sendEmail(args)))
    ),
} as const;

export type { EmailArgs };

export {
  ConfigurationError,
  EmailSendError,
  RateLimitError,
  ValidationError,
} from "./errors";

export { EmailArgsSchema } from "./types";
