import { Request, Response, NextFunction } from 'express';
import { LoginAutomationService } from '../services/login-automation';
import { LoginRequest, LoginResponse } from '../types';

const automationService = new LoginAutomationService();

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email, appPassword } = req.body as Partial<LoginRequest>;

  if (!email || !appPassword) {
    res.status(400).json({
      success: false,
      error: 'email e appPassword são obrigatórios',
    } satisfies LoginResponse);
    return;
  }

  try {
    const result = await automationService.execute({ email, appPassword });
    res.status(200).json({
      success: result.success,
      message: result.message,
      appSession: result.appSession,
    } satisfies LoginResponse);
  } catch (err) {
    next(err);
  }
}
