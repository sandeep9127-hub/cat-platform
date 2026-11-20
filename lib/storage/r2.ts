import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage for original documents, parsed text and exports
 * (Cloudflare R2, CAT account, private bucket).
 *
 * R2 speaks the S3 API, so this module works unchanged against any
 * S3-compatible store: set the endpoint/credentials and it moves.
 * Nothing is public; readers get short-lived signed links.
 */

let client: S3Client | null = null;

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

const bucket = () => env("R2_BUCKET");

export function storageEnabled(): boolean {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].every(
    (k) => !!process.env[k]?.trim(),
  );
}

/** Keys are built by the app, never taken from user input. */
function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9/_.-]{0,500}$/i.test(key) || key.includes("..") || key.startsWith("/")) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<void> {
  assertSafeKey(key);
  await s3().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType, Metadata: metadata }),
  );
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  assertSafeKey(key);
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  return res.Body.transformToByteArray();
}

export async function objectExists(key: string): Promise<boolean> {
  assertSafeKey(key);
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch (e) {
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

export async function deleteObject(key: string): Promise<void> {
  assertSafeKey(key);
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Original-document types editors may upload. */
export const UPLOAD_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
} as const;
export type UploadType = keyof typeof UPLOAD_TYPES;
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Whitelist a download filename; never pass user text into a header verbatim. */
function safeFilename(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^A-Za-z0-9._ -]/g, "_").replace(/_+/g, "_").trim();
  return (cleaned || "download").slice(0, 128);
}

/**
 * Short-lived download link (default 10 minutes) for a private object.
 * Always served as an attachment (PDFs may opt into inline viewing), so a
 * stored file can never render as a page on a browsable origin.
 */
export async function signedGetUrl(
  key: string,
  seconds = 600,
  opts: { downloadName?: string; inlinePdf?: boolean } = {},
): Promise<string> {
  assertSafeKey(key);
  const name = safeFilename(opts.downloadName ?? key.split("/").pop() ?? "download");
  const inline = opts.inlinePdf === true;
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${name}"`,
      ...(inline ? { ResponseContentType: "application/pdf" } : {}),
    }),
    { expiresIn: Math.min(Math.max(seconds, 60), 3600) },
  );
}

/**
 * Short-lived upload link so editors' browsers upload straight to R2.
 * Bound to an allowed document type and the exact declared size (both are
 * part of the signature, so the browser can't send anything else).
 */
export async function signedPutUrl(
  key: string,
  contentType: string,
  bytes: number,
  seconds = 900,
): Promise<string> {
  assertSafeKey(key);
  if (!(contentType in UPLOAD_TYPES)) throw new Error(`Upload type not allowed: ${contentType}`);
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload size not allowed: ${bytes}`);
  }
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: bytes }),
    { expiresIn: Math.min(Math.max(seconds, 60), 3600), signableHeaders: new Set(["content-type", "content-length"]) },
  );
}
