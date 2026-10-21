import env from '@cota/config';
import { requisicaoPermitida } from '@cota/pdf';
import { describe, expect, it } from 'vitest';

describe('requests made while printing a PDF', () => {
  it.each([
    'data:image/png;base64,iVBORw0KGgo=',
    `${env.S3_ENDPOINT}/${env.S3_BUCKET}/accounts/a/proposals/p/photos/abc.png?X-Amz-Signature=x`,
    'https://placehold.co/900x450',
    'https://fonts.gstatic.com/s/font.woff2',
  ])('allows %s', (url) => {
    expect(requisicaoPermitida(url)).toBe(true);
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'https://169.254.169.254/latest/meta-data/',
    'https://127.0.0.1:3333/api/v1/clients',
    'https://localhost/admin',
    'https://10.0.3.7/',
    'https://172.20.0.5:6379/',
    'https://192.168.1.1/',
    'https://100.64.0.1/',
    'https://[::1]/',
    'https://metadata.google.internal/computeMetadata/v1/',
    'https://printer.local/',
    'http://example.com/logo.png',
    'file:///etc/passwd',
    'ftp://example.com/x',
    `${env.S3_ENDPOINT}.evil.example/x`,
  ])('blocks %s', (url) => {
    expect(requisicaoPermitida(url)).toBe(false);
  });
});
