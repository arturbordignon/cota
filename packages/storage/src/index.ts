import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '@crane/config';

const usePathStyle = !env.S3_ENDPOINT.includes('amazonaws.com');

const s3Client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: usePathStyle,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY
  }
});

interface UploadUrlInput {
  key: string;
  contentType: string;
  expiresIn?: number;
}

interface DownloadUrlInput {
  key: string;
  expiresIn?: number;
}

export async function createUploadUrl({ key, contentType, expiresIn = 900 }: UploadUrlInput) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

export async function createDownloadUrl({ key, expiresIn = 900 }: DownloadUrlInput) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

export function getS3Client() {
  return s3Client;
}
