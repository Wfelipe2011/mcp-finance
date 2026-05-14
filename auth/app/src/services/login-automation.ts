import { BrowserAutomation } from '../integrations/browser';
import { GmailReader } from '../integrations/gmail';
import { getValidSession, saveSession } from '../integrations/session-store';
import { AutomationResult, LoginRequest } from '../types';

export class LoginAutomationService {
  async execute({ email, appPassword }: LoginRequest): Promise<AutomationResult> {
    // Sessão válida em cache — retorna sem rodar o fluxo de automação
    const cached = getValidSession(email);
    if (cached) {
      console.log('[LoginAutomation] Sessão válida encontrada em cache, retornando appSession armazenado');
      return { success: true, message: 'Sessão reutilizada do cache', appSession: cached };
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

      let result: AutomationResult;
      try {
        result = await browser.navigateToMagicLink(magicLink);
      } catch (err) {
        throw new Error(
          `[LoginAutomation] Falha ao navegar para o magic link: ${(err as Error).message}`
        );
      }

      saveSession(email, result.appSession);
      return result;
    } finally {
      await browser.close();
    }
  }
}
