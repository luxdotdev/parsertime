import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const REQUIRED_ENV_VARS = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET_NAME",
] as const;

function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }
}

function isVercelBlobUrl(url: string): boolean {
  return (
    url.startsWith("https://") &&
    url.includes(".public.blob.vercel-storage.com")
  );
}

function toSlug(mapName: string): string {
  return mapName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function main() {
  checkEnvVars();

  const prisma = new PrismaClient();

  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });

  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  async function upload(key: string, body: Buffer, contentType: string) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  const records = await prisma.mapCalibration.findMany({
    orderBy: { id: "asc" },
  });

  const total = records.length;
  console.log(`Found ${total} MapCalibration record(s).`);

  let successCount = 0;
  let skipCount = 0;
  let failureCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const index = i + 1;

    if (!isVercelBlobUrl(record.imageUrl)) {
      console.log(
        `[${index}/${total}] Skipping "${record.mapName}" — not a Vercel Blob URL`
      );
      skipCount++;
      continue;
    }

    try {
      let originalBuffer: Buffer | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(record.imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          originalBuffer = Buffer.from(arrayBuffer);
          break;
        } catch (fetchErr) {
          if (attempt < 2) {
            const delay = 2000 * (attempt + 1);
            console.log(
              `[${index}/${total}] Download attempt ${attempt + 1} failed for "${record.mapName}", retrying in ${delay}ms...`
            );
            await new Promise((r) => setTimeout(r, delay));
          } else {
            throw fetchErr;
          }
        }
      }
      if (!originalBuffer) throw new Error("Download failed after 3 attempts");

      const slug = toSlug(record.mapName);
      const originalKey = `map-images/${slug}/original.png`;
      const displayKey = `map-images/${slug}/display.png`;

      await upload(originalKey, originalBuffer, "image/png");

      const metadata = await sharp(originalBuffer).metadata();
      let displayBuffer: Buffer;
      if (metadata.width && metadata.width > 2560) {
        displayBuffer = await sharp(originalBuffer)
          .resize(2560)
          .png()
          .toBuffer();
      } else {
        displayBuffer = originalBuffer;
      }

      await upload(displayKey, displayBuffer, "image/png");

      await prisma.mapCalibration.update({
        where: { id: record.id },
        data: {
          imageUrl: originalKey,
          displayImageKey: displayKey,
        },
      });

      console.log(
        `[${index}/${total}] Migrated "${record.mapName}" → ${originalKey}`
      );
      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[${index}/${total}] Failed "${record.mapName}": ${message}`
      );
      failureCount++;
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Failed:  ${failureCount}`);

  await prisma.$disconnect();
}

main();
