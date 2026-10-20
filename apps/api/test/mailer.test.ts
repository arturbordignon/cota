import { describe, expect, it } from 'vitest';

import { montarEmailConvite } from '../src/lib/mailer.js';

describe('invite email', () => {
  it('escapes the names typed by users', () => {
    const { html } = montarEmailConvite({
      inviteUrl: 'https://app.cota.test/accept-invite?token=abc',
      accountName: '<a href="https://phish.example">Verifique sua conta</a>',
      invitedBy: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<a href="https://phish.example">');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;a href=&quot;https://phish.example&quot;&gt;');
    expect(html).toContain('href="https://app.cota.test/accept-invite?token=abc"');
  });

  it('keeps the plain text version readable', () => {
    const { text, subject } = montarEmailConvite({
      inviteUrl: 'https://app.cota.test/accept-invite?token=abc',
      accountName: 'Guindastes & Cia',
      invitedBy: null,
    });
    expect(subject).toBe('Convite para acessar o workspace Guindastes & Cia');
    expect(text).toContain('Você foi convidado para colaborar.');
    expect(text).toContain('https://app.cota.test/accept-invite?token=abc');
  });
});
