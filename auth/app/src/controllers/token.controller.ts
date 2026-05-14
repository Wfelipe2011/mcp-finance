import { Request, Response, NextFunction } from 'express';
import { LoginAutomationService } from '../services/login-automation';

const automationService = new LoginAutomationService();

export async function tokenHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const email = process.env['PLUGGY_EMAIL'];
  const appPassword = process.env['PLUGGY_PASSWORD'];

  if (!email || !appPassword) {
    res.status(500).json({
      error: 'PLUGGY_EMAIL e PLUGGY_PASSWORD devem estar definidos no ambiente',
    });
    return;
  }

  try {
    const result = await automationService.execute({ email, appPassword });

    const savedAt = new Date();
    const expiresAt = new Date(savedAt.getTime() + 24 * 60 * 60 * 1000);

    res.status(200).json({
      token: result.appSession,
      saved_at: savedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
