import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Endpoint = process.env.S3_ENDPOINT;
if (s3Endpoint && !s3Endpoint.startsWith('http://') && !s3Endpoint.startsWith('https://')) {
  s3Endpoint = `http://${s3Endpoint}`;
}

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

function buildPublicUrl(key: string): string {
  let baseUrl = process.env.S3_PUBLIC_URL;
  if (baseUrl) {
    const bucket = process.env.S3_BUCKET_NAME as string;
    if (!baseUrl.endsWith(bucket)) {
      baseUrl = baseUrl.endsWith('/') ? `${baseUrl}${bucket}` : `${baseUrl}/${bucket}`;
    }
    return `${baseUrl}/${key}`;
  }
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

export async function uploadToS3(buffer: Buffer, key: string, contentType = 'image/png'): Promise<string | null> {
  if (!process.env.S3_BUCKET_NAME) return null;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );

    return buildPublicUrl(key);
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`[s3] Error uploading ${key}:`, error.message || error);
    return null;
  }
}
