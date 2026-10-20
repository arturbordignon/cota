import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';

import env from '@cota/config';

interface InviteEmailPayload {
  to: string;
  inviteUrl: string;
  accountName: string;
  invitedBy?: string | null;
  logger?: FastifyBaseLogger;
}

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let transporterPromise: Promise<Transporter | null> | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    if (!env.SMTP_HOST) {
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD,
            }
          : undefined,
    });

    try {
      await transporter.verify();
      return transporter;
    } catch (error) {
      transporterPromise = null;
      throw error;
    }
  })();

  return transporterPromise;
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The account and inviter names are typed by users, so they are escaped before
// going into the HTML: otherwise anyone could send links or markup from our domain.
export function montarEmailConvite({
  inviteUrl,
  accountName,
  invitedBy,
}: Pick<InviteEmailPayload, 'inviteUrl' | 'accountName' | 'invitedBy'>) {
  const subject = `Convite para acessar o workspace ${accountName}`;
  let inviterLine = 'Você foi convidado para colaborar.';
  if (invitedBy) {
    inviterLine = `${invitedBy} convidou você para colaborar.`;
  }
  const text = `${inviterLine}\n\nAcesse o link abaixo para concluir seu cadastro:\n${inviteUrl}\n\nCaso não reconheça este convite, ignore este e-mail.`;
  const link = escaparHtml(inviteUrl);
  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 480px;">
        <p>${escaparHtml(inviterLine)}</p>
        <p><strong>Workspace:</strong> ${escaparHtml(accountName)}</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;">
            Aceitar convite
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole o link abaixo no navegador:</p>
        <p><a href="${link}">${link}</a></p>
        <p style="color:#64748b;font-size:12px;">Ignorar se não foi você quem solicitou.</p>
      </div>
    `;
  return { subject, text, html };
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  accountName,
  invitedBy,
  logger,
}: InviteEmailPayload): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      logger?.warn('SMTP configuration missing; skipping invite email');
      return false;
    }

    const { subject, text, html } = montarEmailConvite({ inviteUrl, accountName, invitedBy });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    logger?.error({ err: error }, 'Failed to send invite email');
    return false;
  }
}
