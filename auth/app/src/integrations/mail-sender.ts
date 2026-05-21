import nodemailer from "nodemailer";
import { env } from "../config/env";

export class MailSender {
  constructor(
    private readonly user: string,
    private readonly appPassword: string,
  ) {}

  async sendMagicLink(to: string, magicLink: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: this.user,
        pass: this.appPassword,
      },
    });

    const from = env.smtp.from || this.user;
    const subject = env.smtp.magicLinkSubject;

    await transporter.sendMail({
      from,
      to,
      subject,
      text: [
        "Use o link abaixo para concluir o login no Meu Pluggy:",
        "",
        magicLink,
      ].join("\n"),
      html: [
        "<p>Use o link abaixo para concluir o login no Meu Pluggy:</p>",
        `<p><a href="${escapeHtmlAttr(magicLink)}">${escapeHtml(magicLink)}</a></p>`,
      ].join("\n"),
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}
