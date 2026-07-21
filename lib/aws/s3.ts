import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { EmergencyReport } from "@/lib/types";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || "vigil-rag-corpus";

function isConfigured() {
  const key = process.env.AWS_ACCESS_KEY_ID || "";
  return key.length > 0 && !key.includes("your_aws");
}

// ─── Upload a generic document ────────────────────────────────────────────────
export async function uploadDocument(
  key: string,
  content: string,
  contentType = "application/json"
): Promise<boolean> {
  if (!isConfigured()) {
    console.warn("[S3] Credentials not configured — skipping upload.");
    return false;
  }
  try {
    await s3Client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: content, ContentType: contentType })
    );
    console.log(`[S3] Uploaded: ${key}`);
    return true;
  } catch (e) {
    console.error("[S3] Upload failed:", e);
    return false;
  }
}

// ─── Upload an Emergency Report and return a pre-signed download URL ─────────
export async function uploadEmergencyReport(report: EmergencyReport): Promise<string | null> {
  if (!isConfigured()) {
    console.warn("[S3] Credentials not configured — report not archived.");
    return null;
  }

  const ts        = new Date(report.generated_at ?? Date.now());
  const dateStr   = ts.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr   = ts.toISOString().slice(11, 19).replace(/:/g, "-"); // HH-MM-SS
  const zone      = report.trigger_zone_id || "UNKNOWN";
  const key       = `reports/${dateStr}/${zone}-${timeStr}-emergency-report.json`;

  const content = JSON.stringify(
    {
      _vigil_export:    "VIGIL Emergency Response Report",
      _exported_at:     ts.toISOString(),
      _version:         "1.0",
      _regulatory_note: "Generated under OISD-116 Section 7.1 and DGFASLI incident reporting framework",
      ...report,
    },
    null,
    2
  );

  const filename = `VIGIL-Emergency-${zone}-${dateStr}.json`;

  const uploaded = await uploadDocument(key, content, "application/json");
  if (!uploaded) return null;

  // Re-upload with Content-Disposition so browser downloads instead of opening inline
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: content,
        ContentType: "application/json",
        ContentDisposition: `attachment; filename="${filename}"`,
      })
    );
  } catch {}

  try {
    // Pre-signed URL valid for 24 hours
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 86400 }
    );
    console.log(`[S3] Emergency report archived → ${key}`);
    return url;
  } catch (e) {
    console.error("[S3] Pre-sign failed:", e);
    return null;
  }
}

// ─── List corpus documents ────────────────────────────────────────────────────
export async function listCorpusDocuments(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "corpus/" })
    );
    return (response.Contents || []).map((obj) => obj.Key || "").filter(Boolean);
  } catch (e) {
    console.error("[S3] List failed:", e);
    return [];
  }
}

// ─── Get a document from S3 ───────────────────────────────────────────────────
export async function getDocument(key: string): Promise<string | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return (await response.Body?.transformToString()) || null;
  } catch (e) {
    console.error(`[S3] Get failed for ${key}:`, e);
    return null;
  }
}
