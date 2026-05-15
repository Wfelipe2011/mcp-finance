import fs from 'fs';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { env } from '../config/env';
import { AutomationResult } from '../types';

export class BrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;

  private async takeErrorScreenshot(page: Page, context: string): Promise<void> {
    try {
      const dir = path.resolve(process.cwd(), env.screenshotsDir);
      fs.mkdirSync(dir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filepath = path.join(dir, `error-${context}-${timestamp}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.error(`[BrowserAutomation] Screenshot salvo: ${filepath}`);
    } catch (screenshotErr) {
      console.error('[BrowserAutomation] Falha ao salvar screenshot:', screenshotErr);
    }
  }

  private async waitForSelectorSafe(
    page: Page,
    selector: string,
    context: string,
    timeout = 15_000
  ): Promise<void> {
    try {
      await page.waitForSelector(selector, { timeout, visible: true });
    } catch (err) {
      await this.takeErrorScreenshot(page, context);
      throw err;
    }
  }

  /**
   * Preenche o campo de e-mail via triple-click (seleciona tudo) + type (substitui).
   * Compatível com inputs controlados por React e outros frameworks.
   * Valida o preenchimento e tenta novamente se necessário.
   */
  private async fillEmailWithValidation(
    page: Page,
    selector: string,
    email: string,
    maxAttempts = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Triple-click seleciona todo o texto existente; type substitui a seleção
      await page.click(selector, { clickCount: 3 });
      await page.type(selector, email, { delay: 30 });

      const filled = await page.evaluate(
        (sel) => (document.querySelector(sel) as HTMLInputElement | null)?.value ?? '',
        selector
      );

      if (filled === email) return;

      console.warn(
        `[BrowserAutomation] E-mail não preenchido corretamente (tentativa ${attempt}/${maxAttempts}). Esperado: "${email}", Obtido: "${filled}"`
      );

      // Aguarda um momento antes de tentar novamente
      await new Promise((r) => setTimeout(r, 500));
    }

    if (this.page) await this.takeErrorScreenshot(this.page, 'email-fill-failed');
    throw new Error(
      `[BrowserAutomation] Não foi possível preencher o campo de e-mail após ${maxAttempts} tentativas`
    );
  }

  /**
   * Fase 1: abre a landing page do meu.pluggy.ai, clica na âncora de login,
   * preenche o e-mail e submete — o Pluggy envia um magic link por e-mail.
   */
  async startLogin(email: string): Promise<void> {
    const { url, selectors } = env.pluggy;

    this.browser = await puppeteer.launch({
      headless: env.puppeteer.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();

    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Clica na âncora de login (não navega direto para /login)
    await this.waitForSelectorSafe(this.page, selectors.loginLink, 'login-link');
    await this.page.click(selectors.loginLink);

    await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30_000 });

    // Aguarda o input de e-mail ficar disponível e visível
    await this.waitForSelectorSafe(this.page, selectors.email, 'email-input', 30_000);
    await this.fillEmailWithValidation(this.page, selectors.email, email);

    await this.waitForSelectorSafe(this.page, selectors.submitEmail, 'submit-email');
    await this.page.click(selectors.submitEmail);
  }

  /**
   * Fase 2: navega para o magic link recebido por e-mail.
   * O Auth0 processa o link e redireciona de volta ao meu.pluggy.ai.
   * IMPORTANTE: usa a mesma página que submeteu o e-mail para preservar
   * o estado/cookies Auth0 da sessão (obrigatório para o magic link funcionar).
   */
  async navigateToMagicLink(magicLinkUrl: string): Promise<AutomationResult> {
    if (!this.browser || !this.page) {
      throw new Error('[BrowserAutomation] startLogin deve ser chamado antes de navigateToMagicLink');
    }

    await this.page.goto(magicLinkUrl, { waitUntil: 'networkidle2', timeout: 30_000 });

    const finalUrl = this.page.url();
    if (!finalUrl.includes(env.pluggy.successUrlPattern)) {
      await this.takeErrorScreenshot(this.page, 'magic-link-redirect');
      throw new Error(
        `[BrowserAutomation] Login falhou: URL inesperada após magic link (${finalUrl})`
      );
    }

    const cookies = await this.page.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'appSession');
    if (!sessionCookie?.value) {
      await this.takeErrorScreenshot(this.page, 'app-session-missing');
      throw new Error('[BrowserAutomation] Cookie "appSession" não encontrado após login');
    }

    return { success: true, message: 'Login realizado com sucesso', appSession: sessionCookie.value };
  }

  /**
   * Troca o appSession por um JWT accessToken chamando GET /api/access-token.
   * Retorna também o novo appSession do set-cookie, se presente.
   */
  async exchangeForAccessToken(
    appSession: string
  ): Promise<{ accessToken: string; newAppSession?: string }> {
    const response = await fetch('https://meu.pluggy.ai/api/access-token', {
      method: 'GET',
      headers: {
        Cookie: `appSession=${appSession}`,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://meu.pluggy.ai/',
      },
    });

    if (!response.ok) {
      throw new Error(
        `[BrowserAutomation] Falha ao trocar appSession por accessToken: HTTP ${response.status}`
      );
    }

    const body = (await response.json()) as { accessToken?: string };
    if (!body.accessToken) {
      throw new Error(
        '[BrowserAutomation] accessToken ausente no body da resposta de /api/access-token'
      );
    }

    const setCookie = response.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/appSession=([^;]+)/);
    const newAppSession = match ? match[1] : undefined;

    return { accessToken: body.accessToken, newAppSession };
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }
}
