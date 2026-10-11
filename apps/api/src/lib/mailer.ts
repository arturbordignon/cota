import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';

import env from '@crane/config';

interface InviteEmailPayload {
  to: string;
  inviteUrl: string;
  accountName: string;
  invitedBy?: string | null;
  logger?: FastifyBaseLogger;
}

let transporterPromise: Promise<nodemailer.Transporter | null> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
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

    const subject = `Convite para acessar o workspace ${accountName}`;
    const inviterLine = invitedBy ? `${invitedBy} convidou você para colaborar.` : 'Você foi convidado para colaborar.';
    const text = `${inviterLine}\n\nAcesse o link abaixo para concluir seu cadastro:\n${inviteUrl}\n\nCaso não reconheça este convite, ignore este e-mail.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 480px;">
        <p>${inviterLine}</p>
        <p><strong>Workspace:</strong> ${accountName}</p>
        <p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;">
            Aceitar convite
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole o link abaixo no navegador:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p style="color:#64748b;font-size:12px;">Ignorar se não foi você quem solicitou.</p>
      </div>
    `;

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    logger?.error({ err: error, to }, 'Failed to send invite email');
    return false;
  }
}
