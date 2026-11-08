import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '@cota/config';

function criarCliente(endpoint: string) {
  return new S3Client({
    region: env.AWS_REGION,
    endpoint,
    forcePathStyle: !endpoint.includes('amazonaws.com'),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    }
  });
}

// Reads and writes go to the address the servers reach. Links for browsers are
// signed for the public address: the host is part of the signature, so a link
// signed for minio:9000 can't be opened as localhost:9000.
const s3Client = criarCliente(env.S3_ENDPOINT);
const clientePublico = env.S3_PUBLIC_ENDPOINT ? criarCliente(env.S3_PUBLIC_ENDPOINT) : s3Client;

interface UploadUrlInput {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresIn?: number;
}

interface DownloadUrlInput {
  key: string;
  expiresIn?: number;
  /** For the PDF worker, which reaches storage at the internal address. */
  interno?: boolean;
}

export async function createUploadUrl({ key, contentType, contentLength, expiresIn = 900 }: UploadUrlInput) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength
  });

  const url = await getSignedUrl(clientePublico, command, { expiresIn });
  return url;
}

export async function createDownloadUrl({ key, expiresIn = 900, interno = false }: DownloadUrlInput) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key
  });

  const url = await getSignedUrl(interno ? s3Client : clientePublico, command, { expiresIn });
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

const EXCLUSOES_SIMULTANEAS = 10;

// Deletes one object at a time (10 in parallel) instead of DeleteObjects: the
// bulk call needs a checksum header that S3-compatible stores such as MinIO
// and the current AWS SDK don't agree on.
export async function apagarPrefixo(prefixo: string) {
  let continuacao: string | undefined;
  let apagados = 0;
  do {
    const pagina = await s3Client.send(
      new ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: prefixo, ContinuationToken: continuacao })
    );
    const chaves = (pagina.Contents ?? []).flatMap((objeto) => (objeto.Key ? [objeto.Key] : []));
    for (let inicio = 0; inicio < chaves.length; inicio += EXCLUSOES_SIMULTANEAS) {
      await Promise.all(chaves.slice(inicio, inicio + EXCLUSOES_SIMULTANEAS).map((chave) => apagarObjeto(chave)));
    }
    apagados += chaves.length;
    continuacao = pagina.NextContinuationToken;
  } while (continuacao);
  return apagados;
}

export function getS3Client() {
  return s3Client;
}
