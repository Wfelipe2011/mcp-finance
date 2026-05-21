import { ImapFlow } from "imapflow";
import { env } from "../config/env";

export class GmailReader {
  constructor(
    private readonly user: string,
    private readonly appPassword: string
  ) {}

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: this.user,
        pass: this.appPassword,
      },
      tls: {
        rejectUnauthorized: false,
        // Força o uso de TLS 1.2 ou superior, que o Gmail exige
        minVersion: "TLSv1.2",
      },
      socketTimeout: 60000,
      greetingTimeout: 60000,
      logger: false, // Ative temporariamente para ver exatamente ONDE trava
    });
  }

  async waitForMagicLink(afterTimestamp: Date, deadlineTimeoutMs: number = env.gmail.pollTimeoutMs, pollIntervalMs: number = env.gmail.pollIntervalMs): Promise<string> {
    const deadline = Date.now() + deadlineTimeoutMs;
    const client = this.createClient();

    await client.connect(); // Conecta uma única vez

    try {
      while (Date.now() < deadline) {
        // Passamos o cliente já conectado para a função
        const url = await this.fetchLatestMagicLink(afterTimestamp, client);
        if (url) return url;

        await sleep(pollIntervalMs);
      }
    } finally {
      await client.logout().catch(() => undefined);
    }

    throw new Error(`[GmailReader] Magic link não encontrado`);
  }

  private async fetchLatestMagicLink(
    afterTimestamp: Date,
    client: ImapFlow,
  ): Promise<string | null> {
    // Aqui você NÃO dá connect(), apenas usa o client recebido
    let lock = await client.getMailboxLock("INBOX");
    try {
      const since = formatImapDate(afterTimestamp);
      const messages = client.fetch(
        { since, from: env.gmail.linkSender },
        {
          bodyParts: ["TEXT"], // Baixa apenas a parte textual (muito mais leve)
          internalDate: true,
        },
      );

      let latestDate: Date | null = null;
      let latestBody = "";

      for await (const msg of messages) {
        // internalDate = data em que o servidor recebeu o e-mail (imutável, confiável)
        const raw = msg.internalDate ?? new Date(0);
        const date = raw instanceof Date ? raw : new Date(raw);
        const bodyChunk = msg.bodyParts?.get('text');
        const body = bodyChunk ? bodyChunk.toString('utf-8') : "";
        if (!latestDate || date > latestDate || !latestBody) {
          latestDate = date;
          latestBody = body;
        }
      }

      if (!latestBody) return null;

      return extractMagicLink(latestBody, env.gmail.magicLinkUrlPattern);
    } catch (err) {
      console.log("🚀 ~ GmailReader ~ fetchLatestMagicLink ~ err:");
      const code = (err as NodeJS.ErrnoException).code;
      console.log("🚀 ~ GmailReader ~ fetchLatestMagicLink ~ code:", code);
      // Conexão resetada pelo servidor (timeout do Gmail) — polling tentará novamente
      if (code === "ECONNRESET" || code === "EPIPE") return null;
      throw err;
    } finally {
      lock.release();
    }
  }
}

/**
 * Extrai a primeira URL do corpo do e-mail que corresponde ao padrão do magic link.
 * Tenta primeiro em atributos href (HTML), depois em texto puro.
 */
function extractMagicLink(rawBody: string, urlPattern: string): string | null {
  const body = decodeQuotedPrintable(rawBody);

  // Busca em href="..." (e-mail HTML)
  const hrefMatches = [...body.matchAll(/href="(https?:\/\/[^"]+)"/gi)];
  for (const m of hrefMatches) {
    if (m[1].includes(urlPattern)) return m[1];
  }

  // Fallback: busca URL em texto puro
  const plainMatches = [...body.matchAll(/https?:\/\/\S+/g)];
  for (const m of plainMatches) {
    if (m[0].includes(urlPattern)) return m[0];
  }

  return null;
}

function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function formatImapDate(date: Date): Date {
  return new Date(date.getTime() - 60_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
