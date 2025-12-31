import type { SendEmailResponse } from "@aws-sdk/client-ses";
import {
  SendEmailCommand,
  type SendEmailRequest,
  SES,
} from "@aws-sdk/client-ses";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import {
  Context,
  Effect,
  Layer,
  ManagedRuntime,
  Schedule,
  Schema,
} from "effect";
import {
  ConfigurationError,
  EmailSendError,
  RateLimitError,
  ValidationError,
} from "./errors";
import { type EmailArgs, EmailArgsSchema } from "./types";

// Service interface
export type Service = {
  sendEmail(
    args: EmailArgs
  ): Effect.Effect<
    SendEmailResponse,
    ValidationError | ConfigurationError | RateLimitError | EmailSendError
  >;
};

export class EmailService extends Context.Tag("EmailService")<
  EmailService,
  Service
>() {}

// Rate limiter configuration
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
});

// Service implementation
function createService() {
  return Effect.gen(function* () {
    // Validate environment configuration
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_SES_REGION ?? "us-east-1";

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return yield* new ConfigurationError({
        field: "aws_credentials",
        message:
          "Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.",
      });
    }

    // Initialize SES client
    const sesClient = new SES({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    const service: Service = {
      sendEmail: (args: EmailArgs) =>
        Effect.gen(function* () {
          // Validate input using Effect Schema
          const validatedArgs = yield* Schema.decodeUnknown(EmailArgsSchema)(
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
            from = "lux.dev <noreply@lux.dev>",
            subject,
            html,
            replyTo,
            ccAddresses,
            bccAddresses,
          } = validatedArgs;

          // Rate limiting
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

          // Build SES email parameters
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

          // Send email via SES with retry logic
          const result = yield* Effect.tryPromise({
            try: () => sesClient.send(new SendEmailCommand(emailParams)),
            catch: (error) =>
              new EmailSendError({
                recipient: to,
                operation: `send email with subject: ${subject}`,
                cause: error,
              }),
          }).pipe(
            Effect.retry(
              Schedule.exponential(1000).pipe(
                Schedule.compose(Schedule.recurs(2))
              )
            ),
            Effect.withSpan("email.send", {
              attributes: {
                to,
                from,
                subject,
                hasReplyTo: !!replyTo,
                ccCount: ccAddresses?.length ?? 0,
                bccCount: bccAddresses?.length ?? 0,
              },
            }),
            Effect.tapBoth({
              onFailure: (error) =>
                Effect.logError(
                  `Failed to send email to ${to}: ${error._tag} - ${error.message}`
                ),
              onSuccess: (response) =>
                Effect.logInfo(
                  `Email sent successfully to ${to}. MessageId: ${response.MessageId}`
                ),
            })
          );

          return result;
        }).pipe(
          Effect.withSpan("email.sendEmail", {
            attributes: { to: args.to, subject: args.subject },
          })
        ),
    };

    return service;
  });
}

// Production Layer
export const layerFromConfig = Layer.effect(EmailService, createService());

// Layer composition for easy use
export function layer() {
  return layerFromConfig;
}

// Runtime for Promise-based usage
export const emailRuntime = ManagedRuntime.make(layer());

/**
 * Email service instance that provides a simplified API for sending emails.
 *
 * This service handles all the complexity of Effect-based email operations,
 * rate limiting, validation, and AWS SES integration behind a clean Promise-based API.
 *
 * Features:
 * - Rate limiting (10 emails per minute per recipient)
 * - Input validation using Effect Schema
 * - AWS SES integration
 * - Comprehensive error handling
 * - Automatic retry logic with exponential backoff
 * - Structured logging and observability
 */
export const email = {
  sendEmail: (args: EmailArgs) =>
    emailRuntime.runPromise(
      EmailService.pipe(Effect.flatMap((service) => service.sendEmail(args)))
    ),
} as const;

// Re-export types for consumers
export type { EmailArgs };

// Re-export error types for API routes
export {
  ConfigurationError,
  EmailSendError,
  RateLimitError,
  ValidationError,
} from "./errors";

// Re-export schemas for advanced users
export { EmailArgsSchema } from "./types";
