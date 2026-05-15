import { Request, Response, NextFunction } from 'express';
import { LoginAutomationService } from '../services/login-automation';

const automationService = new LoginAutomationService();

export async function tokenHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email, appPassword } = req.body as { email?: string; appPassword?: string };

  if (!email || !appPassword) {
    res.status(400).json({
      error: 'email e appPassword são obrigatórios no body',
    });
    return;
  }

  try {
    const result = await automationService.execute({ email, appPassword });

    const savedAt = new Date();
    const expiresAt = new Date(savedAt.getTime() + 24 * 60 * 60 * 1000);

    res.status(200).json({
      token: result.accessToken,
      saved_at: savedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
