import { BrowserAutomation } from '../integrations/browser';
import { GmailReader } from '../integrations/gmail';
import { getValidSession, saveSession } from '../integrations/session-store';
import { LoginRequest } from '../types';

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

      let magicLink: string;
      try {
        magicLink = await gmail.waitForMagicLink(startedAt);
      } catch (err) {
        throw new Error(
          `[LoginAutomation] Falha ao aguardar magic link no Gmail: ${(err as Error).message}`
        );
      }

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
}
