import { BrowserAutomation } from '../integrations/browser';
import { GmailReader } from '../integrations/gmail';
import { MailSender } from '../integrations/mail-sender';
import { getValidSession, saveSession } from '../integrations/session-store';
import { ExternalLoginRequest, LoginRequest } from '../types';

export class LoginAutomationService {
  async execute({ email, appPassword }: LoginRequest): Promise<{ success: boolean; message: string; accessToken: string }> {
    // Sessão válida em cache — retorna sem rodar o fluxo de automação
    const cached = getValidSession(email);
    if (cached) {
      console.log('[LoginAutomation] Sessão válida encontrada em cache, retornando accessToken armazenado');
      return { success: true, message: 'Sessão reutilizada do cache', accessToken: cached.accessToken };
    }

    const browser = new BrowserAutomation();
    const gmail = new GmailReader(email, appPassword);
    const startedAt = new Date();

    try {
      await browser.startLogin(email);

      const magicLink = await this.waitForMagicLink(gmail, startedAt);

      let loginResult: { appSession: string };
      try {
        loginResult = await browser.navigateToMagicLink(magicLink);
      } catch (err) {
        throw new Error(
          `[LoginAutomation] Falha ao navegar para o magic link: ${(err as Error).message}`
        );
      }

      let exchangeResult: { accessToken: string; newAppSession?: string };
      try {
        exchangeResult = await browser.exchangeForAccessToken(loginResult.appSession);
      } catch (err) {
        throw new Error(
          `[LoginAutomation] Falha ao trocar appSession por accessToken: ${(err as Error).message}`
        );
      }

      const finalAppSession = exchangeResult.newAppSession ?? loginResult.appSession;
      saveSession(email, finalAppSession, exchangeResult.accessToken);

      return { success: true, message: 'Login realizado com sucesso', accessToken: exchangeResult.accessToken };
    } finally {
      await browser.close();
    }
  }

  async externalExecute({ email, appPassword, customerEmail }: ExternalLoginRequest): Promise<{ success: boolean; message: string; accessToken: string }> {

    const gmail = new GmailReader(email, appPassword);
    const startedAt = new Date();

    const magicLink = await this.waitForMagicLink(gmail, startedAt);

    const recipient = customerEmail;
    const mailSender = new MailSender(email, appPassword);
    await mailSender.sendMagicLink(recipient, magicLink);

    return {
      success: true,
      message: `Magic link enviado para ${recipient}`,
      accessToken: '',
    };
  }

  private async waitForMagicLink(
    gmail: GmailReader,
    startedAt: Date,
    execution: string[] = [],
  ): Promise<string> {
    const THREE_MINUTES_IN_MS = 3 * 60 * 1000;
    const FIFTEEN_SECONDS_IN_MS = 15 * 1000;
    const MAX_ATTEMPTS = 4;

    try {
      return await gmail.waitForMagicLink(startedAt, THREE_MINUTES_IN_MS, FIFTEEN_SECONDS_IN_MS);
    } catch (err) {
      const newExecution = [...execution, (err as Error).message];
      if (newExecution.length >= MAX_ATTEMPTS) {
        throw new Error(
          `[LoginAutomation] Falha ao aguardar magic link no Gmail: ${newExecution.join(',\n\t\t ')}`
        );
      }
      return this.waitForMagicLink(gmail, startedAt, newExecution);
    }
  }
}
