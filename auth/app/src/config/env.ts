import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[config] Variável de ambiente obrigatória não definida: ${name}`);
    process.exit(1);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  port: parseInt(optional('PORT', '3000'), 10),

  pluggyEmail: optional('PLUGGY_EMAIL', ''),
  pluggyPassword: optional('PLUGGY_PASSWORD', ''),

  pluggy: {
    // Landing page — o login é iniciado clicando na âncora, não navegando direto para /login
    url: optional('PLUGGY_URL', 'https://meu.pluggy.ai/'),

    selectors: {
      // Âncora que abre o formulário de login
      loginLink: optional('PLUGGY_SELECTOR_LOGIN_LINK', 'a[href="/login"]'),
      // Campo de e-mail e submit (login passwordless — magic link via e-mail)
      email: optional('PLUGGY_SELECTOR_EMAIL', 'input[type="email"]'),
      submitEmail: optional('PLUGGY_SELECTOR_SUBMIT_EMAIL', 'button[type="submit"]'),
    },

    // Substring da URL que confirma o redirecionamento bem-sucedido de volta ao app
    successUrlPattern: optional('PLUGGY_SUCCESS_URL_PATTERN', 'meu.pluggy.ai'),
  },

  gmail: {
    // Remetente do e-mail com o magic link (ex: no-reply@pluggy.ai)
    linkSender: required('GMAIL_LINK_SENDER'),
    // Substring da URL do magic link que identifica o link correto no corpo do e-mail
    magicLinkUrlPattern: optional('GMAIL_MAGIC_LINK_URL_PATTERN', 'auth0.com'),
    pollIntervalMs: parseInt(optional('GMAIL_POLL_INTERVAL_MS', '3000'), 10),
    pollTimeoutMs: parseInt(optional('GMAIL_POLL_TIMEOUT_MS', '30000'), 10),
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    from: optional('SMTP_FROM', ''),
    magicLinkSubject: optional('SMTP_MAGIC_LINK_SUBJECT', 'Magic link — Meu Pluggy'),
    // Destinatário do reenvio; vazio = usa o e-mail da requisição
    magicLinkRecipient: optional('SMTP_MAGIC_LINK_RECIPIENT', ''),
  },

  puppeteer: {
    headless: optional('PUPPETEER_HEADLESS', 'true') !== 'false',
  },

  screenshotsDir: optional('SCREENSHOTS_DIR', './screenshots'),
  sessionsFile: optional('SESSIONS_FILE', './sessions.json'),
} as const;
