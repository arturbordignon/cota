import { createTransport } from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import env from '@cota/config';

interface InviteEmailPayload {
  to: string;
  inviteUrl: string;
  accountName: string;
  invitedBy?: string | null;
  locale?: string | null;
  logger?: FastifyBaseLogger;
}

type Transporter = ReturnType<typeof createTransport>;

let transporterPromise: Promise<Transporter | null> | null = null;

async function getTransporter(): Promise<Transporter | null> {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    if (!env.SMTP_HOST) {
      return null;
    }

    const transporter = createTransport({
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
const TEXTOS_CONVITE = {
  'pt-BR': {
    subject: (conta: string) => `Convite para acessar o workspace ${conta}`,
    someone: 'Você foi convidado para colaborar.',
    invitedBy: (nome: string) => `${nome} convidou você para colaborar.`,
    intro: 'Acesse o link abaixo para concluir seu cadastro:',
    ignore: 'Caso não reconheça este convite, ignore este e-mail.',
    button: 'Aceitar convite',
    fallback: 'Se o botão não funcionar, copie e cole o link abaixo no navegador:',
    footer: 'Ignorar se não foi você quem solicitou.',
  },
  en: {
    subject: (conta: string) => `Invitation to join the ${conta} workspace`,
    someone: 'You were invited to collaborate.',
    invitedBy: (nome: string) => `${nome} invited you to collaborate.`,
    intro: 'Open the link below to finish setting up your access:',
    ignore: "If you don't recognize this invite, ignore this email.",
    button: 'Accept invite',
    fallback: "If the button doesn't work, copy and paste the link below into your browser:",
    footer: "Ignore it if you didn't ask for it.",
  },
};

// The account and inviter names are typed by users, so they are escaped before
// going into the HTML: otherwise anyone could send links or markup from our domain.
// The email is written in the workspace's language.
export function montarEmailConvite({
  inviteUrl,
  accountName,
  invitedBy,
  locale,
}: Pick<InviteEmailPayload, 'inviteUrl' | 'accountName' | 'invitedBy' | 'locale'>) {
  const textos = locale === 'en' ? TEXTOS_CONVITE.en : TEXTOS_CONVITE['pt-BR'];
  const subject = textos.subject(accountName);
  let inviterLine = textos.someone;
  if (invitedBy) {
    inviterLine = textos.invitedBy(invitedBy);
  }
  const text = `${inviterLine}\n\n${textos.intro}\n${inviteUrl}\n\n${textos.ignore}`;
  const link = escaparHtml(inviteUrl);
  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 480px;">
        <p>${escaparHtml(inviterLine)}</p>
        <p><strong>Workspace:</strong> ${escaparHtml(accountName)}</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;">
            ${textos.button}
          </a>
        </p>
        <p>${escaparHtml(textos.fallback)}</p>
        <p><a href="${link}">${link}</a></p>
        <p style="color:#64748b;font-size:12px;">${escaparHtml(textos.footer)}</p>
      </div>
    `;
  return { subject, text, html };
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  accountName,
  invitedBy,
  locale,
  logger,
}: InviteEmailPayload): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      logger?.warn('SMTP configuration missing; skipping invite email');
      return false;
    }

    const { subject, text, html } = montarEmailConvite({ inviteUrl, accountName, invitedBy, locale });

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
