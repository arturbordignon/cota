import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '@cota/config';

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
  contentLength?: number;
  expiresIn?: number;
}

interface DownloadUrlInput {
  key: string;
  expiresIn?: number;
}

export async function createUploadUrl({ key, contentType, contentLength, expiresIn = 900 }: UploadUrlInput) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength
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

interface UploadObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
}

export async function uploadObject({ key, body, contentType }: UploadObjectInput) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await s3Client.send(command);
  return key;
}

export async function buscarTamanhoDoObjeto(key: string): Promise<number | null> {
  try {
    const resposta = await s3Client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return resposta.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function lerInicioDoObjeto(key: string, bytes: number): Promise<Uint8Array | null> {
  try {
    const resposta = await s3Client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Range: `bytes=0-${bytes - 1}` })
    );
    if (!resposta.Body) {
      return null;
    }
    return await resposta.Body.transformToByteArray();
  } catch {
    return null;
  }
}

export async function apagarObjeto(key: string) {
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function apagarPrefixo(prefixo: string) {
  let continuacao: string | undefined;
  let apagados = 0;
  do {
    const pagina = await s3Client.send(
      new ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: prefixo, ContinuationToken: continuacao })
    );
    const chaves = (pagina.Contents ?? []).flatMap((objeto) => (objeto.Key ? [{ Key: objeto.Key }] : []));
    if (chaves.length > 0) {
      await s3Client.send(new DeleteObjectsCommand({ Bucket: env.S3_BUCKET, Delete: { Objects: chaves } }));
      apagados += chaves.length;
    }
    continuacao = pagina.NextContinuationToken;
  } while (continuacao);
  return apagados;
}

export function getS3Client() {
  return s3Client;
}
