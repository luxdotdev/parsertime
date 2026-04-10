import { EffectObservabilityLive } from "@/instrumentation";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
import {
  DeleteError,
  DownloadError,
  PresignError,
  UploadError,
  ValidationError,
} from "./errors";
import {
  deleteErrorTotal,
  deleteSuccessTotal,
  downloadDuration,
  downloadErrorTotal,
  downloadSuccessTotal,
  presignDuration,
  uploadDuration,
  uploadErrorTotal,
  uploadSuccessTotal,
} from "./metrics";
import {
  type PresignedUploadUrlArgs,
  PresignedUploadUrlArgsSchema,
  type PresignedUrlArgs,
  PresignedUrlArgsSchema,
  type UploadArgs,
  UploadArgsSchema,
  type UploadResponse,
} from "./types";

export type R2Config = {
  readonly accountId: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucketName: string;
};

export class R2ConfigService extends Context.Tag("@app/r2/R2ConfigService")<
  R2ConfigService,
  R2Config
>() {}

export const R2ConfigLive = Layer.effect(
  R2ConfigService,
  Effect.gen(function* () {
    const accountId = yield* Config.string("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = yield* Config.string("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = yield* Config.string(
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY"
    );
    const bucketName = yield* Config.string("CLOUDFLARE_R2_BUCKET_NAME");

    return {
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
    } satisfies R2Config;
  })
);

export type R2ServiceInterface = {
  readonly upload: (
    args: UploadArgs
  ) => Effect.Effect<UploadResponse, ValidationError | UploadError>;
  readonly download: (key: string) => Effect.Effect<Buffer, DownloadError>;
  readonly delete: (key: string) => Effect.Effect<void, DeleteError>;
  readonly getPresignedUrl: (
    args: PresignedUrlArgs
  ) => Effect.Effect<string, ValidationError | PresignError>;
  readonly getPresignedUploadUrl: (
    args: PresignedUploadUrlArgs
  ) => Effect.Effect<string, ValidationError | PresignError>;
};

export class R2Service extends Context.Tag("@app/r2/R2Service")<
  R2Service,
  R2ServiceInterface
>() {}

export const make: Effect.Effect<R2ServiceInterface, never, R2ConfigService> =
  Effect.gen(function* () {
    const config = yield* R2ConfigService;

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return {
      upload: (args: UploadArgs) => {
        const startTime = Date.now();
        const wideEvent: Record<string, unknown> = {
          key: args.key,
          contentType: args.contentType,
          bucket: config.bucketName,
        };

        return Effect.gen(function* () {
          const validatedArgs = yield* S.decodeUnknown(UploadArgsSchema)(
            args
          ).pipe(
            Effect.mapError(
              (parseError) =>
                new ValidationError({
                  field: "upload_args",
                  message: `Invalid upload arguments: ${parseError.message}`,
                })
            ),
            Effect.withSpan("r2.validate-upload-args", {
              attributes: { key: args.key },
            })
          );

          wideEvent.body_size = validatedArgs.body.length;

          const result = yield* Effect.tryPromise({
            try: () =>
              s3Client.send(
                new PutObjectCommand({
                  Bucket: config.bucketName,
                  Key: validatedArgs.key,
                  Body: validatedArgs.body,
                  ContentType: validatedArgs.contentType,
                })
              ),
            catch: (error) =>
              new UploadError({
                key: validatedArgs.key,
                operation: `upload object with key: ${validatedArgs.key}`,
                cause: error,
              }),
          }).pipe(
            Effect.retry({
              schedule: Schedule.exponential(1000).pipe(
                Schedule.jittered,
                Schedule.compose(Schedule.recurs(2))
              ),
            }),
            Effect.withSpan("r2.upload", {
              attributes: {
                key: validatedArgs.key,
                bucket: config.bucketName,
                contentType: validatedArgs.contentType ?? "unknown",
              },
            })
          );

          wideEvent.etag = result.ETag;
          wideEvent.outcome = "success";

          yield* Metric.increment(uploadSuccessTotal);

          return { key: validatedArgs.key } satisfies UploadResponse;
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              wideEvent.outcome = "error";
              wideEvent.error_tag = error._tag;
              wideEvent.error_message = error.message;
            }).pipe(Effect.andThen(Metric.increment(uploadErrorTotal)))
          ),
          Effect.ensuring(
            Effect.suspend(() => {
              const durationMs = Date.now() - startTime;
              wideEvent.duration_ms = durationMs;
              wideEvent.outcome ??= "interrupted";
              const log =
                wideEvent.outcome === "error"
                  ? Effect.logError("r2.upload")
                  : Effect.logInfo("r2.upload");
              return log.pipe(
                Effect.annotateLogs(wideEvent),
                Effect.andThen(uploadDuration(Effect.succeed(durationMs)))
              );
            })
          ),
          Effect.withSpan("r2.upload", {
            attributes: { key: args.key, bucket: config.bucketName },
          })
        );
      },

      download: (key: string) => {
        const startTime = Date.now();
        const wideEvent: Record<string, unknown> = {
          key,
          bucket: config.bucketName,
        };

        return Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              s3Client.send(
                new GetObjectCommand({
                  Bucket: config.bucketName,
                  Key: key,
                })
              ),
            catch: (error) => new DownloadError({ key, cause: error }),
          }).pipe(
            Effect.withSpan("r2.getObject", {
              attributes: { key, bucket: config.bucketName },
            })
          );

          if (!response.Body) {
            return yield* new DownloadError({
              key,
              cause: new Error("Empty response body"),
            });
          }

          const bytes = yield* Effect.tryPromise({
            try: () => response.Body!.transformToByteArray(),
            catch: (error) => new DownloadError({ key, cause: error }),
          });

          const buf = Buffer.from(bytes);
          wideEvent.body_size = buf.length;
          wideEvent.outcome = "success";
          yield* Metric.increment(downloadSuccessTotal);
          return buf;
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              wideEvent.outcome = "error";
              wideEvent.error_tag = error._tag;
              wideEvent.error_message = error.message;
            }).pipe(Effect.andThen(Metric.increment(downloadErrorTotal)))
          ),
          Effect.ensuring(
            Effect.suspend(() => {
              const durationMs = Date.now() - startTime;
              wideEvent.duration_ms = durationMs;
              wideEvent.outcome ??= "interrupted";
              const log =
                wideEvent.outcome === "error"
                  ? Effect.logError("r2.download")
                  : Effect.logInfo("r2.download");
              return log.pipe(
                Effect.annotateLogs(wideEvent),
                Effect.andThen(downloadDuration(Effect.succeed(durationMs)))
              );
            })
          ),
          Effect.withSpan("r2.download", {
            attributes: { key, bucket: config.bucketName },
          })
        );
      },

      delete: (key: string) => {
        const startTime = Date.now();
        const wideEvent: Record<string, unknown> = {
          key,
          bucket: config.bucketName,
        };

        return Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              s3Client.send(
                new DeleteObjectCommand({
                  Bucket: config.bucketName,
                  Key: key,
                })
              ),
            catch: (error) =>
              new DeleteError({
                key,
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("r2.deleteObject", {
              attributes: { key, bucket: config.bucketName },
            })
          );

          wideEvent.outcome = "success";

          yield* Metric.increment(deleteSuccessTotal);
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              wideEvent.outcome = "error";
              wideEvent.error_tag = error._tag;
              wideEvent.error_message = error.message;
            }).pipe(Effect.andThen(Metric.increment(deleteErrorTotal)))
          ),
          Effect.ensuring(
            Effect.suspend(() => {
              const durationMs = Date.now() - startTime;
              wideEvent.duration_ms = durationMs;
              wideEvent.outcome ??= "interrupted";
              const log =
                wideEvent.outcome === "error"
                  ? Effect.logError("r2.delete")
                  : Effect.logInfo("r2.delete");
              return log.pipe(Effect.annotateLogs(wideEvent));
            })
          ),
          Effect.withSpan("r2.delete", {
            attributes: { key, bucket: config.bucketName },
          })
        );
      },

      getPresignedUrl: (args: PresignedUrlArgs) => {
        const startTime = Date.now();

        return Effect.gen(function* () {
          const validatedArgs = yield* S.decodeUnknown(PresignedUrlArgsSchema)(
            args
          ).pipe(
            Effect.mapError(
              (parseError) =>
                new ValidationError({
                  field: "presigned_url_args",
                  message: `Invalid presigned URL arguments: ${parseError.message}`,
                })
            ),
            Effect.withSpan("r2.validate-presign-args", {
              attributes: { key: args.key },
            })
          );

          const url = yield* Effect.tryPromise({
            try: () =>
              getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: config.bucketName,
                  Key: validatedArgs.key,
                }),
                { expiresIn: validatedArgs.expiresIn ?? 3600 }
              ),
            catch: (error) =>
              new PresignError({
                key: validatedArgs.key,
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("r2.getSignedUrl", {
              attributes: {
                key: validatedArgs.key,
                bucket: config.bucketName,
                expiresIn: validatedArgs.expiresIn ?? 3600,
              },
            })
          );

          return url;
        }).pipe(
          Effect.ensuring(
            Effect.suspend(() => {
              const durationMs = Date.now() - startTime;
              return presignDuration(Effect.succeed(durationMs));
            })
          ),
          Effect.withSpan("r2.getPresignedUrl", {
            attributes: { key: args.key },
          })
        );
      },
      getPresignedUploadUrl: (args: PresignedUploadUrlArgs) => {
        const startTime = Date.now();

        return Effect.gen(function* () {
          const validatedArgs = yield* S.decodeUnknown(
            PresignedUploadUrlArgsSchema
          )(args).pipe(
            Effect.mapError(
              (parseError) =>
                new ValidationError({
                  field: "presigned_upload_url_args",
                  message: `Invalid presigned upload URL arguments: ${parseError.message}`,
                })
            ),
            Effect.withSpan("r2.validate-presign-upload-args", {
              attributes: { key: args.key },
            })
          );

          const url = yield* Effect.tryPromise({
            try: () =>
              getSignedUrl(
                s3Client,
                new PutObjectCommand({
                  Bucket: config.bucketName,
                  Key: validatedArgs.key,
                  ContentType: validatedArgs.contentType,
                }),
                { expiresIn: validatedArgs.expiresIn ?? 3600 }
              ),
            catch: (error) =>
              new PresignError({
                key: validatedArgs.key,
                cause: error,
              }),
          }).pipe(
            Effect.withSpan("r2.getSignedUploadUrl", {
              attributes: {
                key: validatedArgs.key,
                bucket: config.bucketName,
                expiresIn: validatedArgs.expiresIn ?? 3600,
              },
            })
          );

          return url;
        }).pipe(
          Effect.ensuring(
            Effect.suspend(() => {
              const durationMs = Date.now() - startTime;
              return presignDuration(Effect.succeed(durationMs));
            })
          ),
          Effect.withSpan("r2.getPresignedUploadUrl", {
            attributes: { key: args.key },
          })
        );
      },
    } satisfies R2ServiceInterface;
  });

export const R2ServiceLive = Layer.effect(R2Service, make).pipe(
  Layer.provide(R2ConfigLive),
  Layer.provide(EffectObservabilityLive)
);

export const r2Runtime = ManagedRuntime.make(R2ServiceLive);

export const r2 = {
  upload: (args: UploadArgs) =>
    r2Runtime.runPromise(
      R2Service.pipe(Effect.flatMap((svc) => svc.upload(args)))
    ),
  download: (key: string) =>
    r2Runtime.runPromise(
      R2Service.pipe(Effect.flatMap((svc) => svc.download(key)))
    ),
  delete: (key: string) =>
    r2Runtime.runPromise(
      R2Service.pipe(Effect.flatMap((svc) => svc.delete(key)))
    ),
  getPresignedUrl: (args: PresignedUrlArgs) =>
    r2Runtime.runPromise(
      R2Service.pipe(Effect.flatMap((svc) => svc.getPresignedUrl(args)))
    ),
  getPresignedUploadUrl: (args: PresignedUploadUrlArgs) =>
    r2Runtime.runPromise(
      R2Service.pipe(Effect.flatMap((svc) => svc.getPresignedUploadUrl(args)))
    ),
} as const;

export type {
  PresignedUploadUrlArgs,
  PresignedUrlArgs,
  UploadArgs,
  UploadResponse,
};

export {
  ConfigurationError,
  DeleteError,
  DownloadError,
  PresignError,
  UploadError,
  ValidationError,
} from "./errors";

export {
  PresignedUploadUrlArgsSchema,
  PresignedUrlArgsSchema,
  UploadArgsSchema,
} from "./types";
