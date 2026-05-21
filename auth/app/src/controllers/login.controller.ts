import { Request, Response, NextFunction } from 'express';
import { LoginAutomationService } from '../services/login-automation';
import { ExternalLoginRequest, LoginRequest, LoginResponse } from '../types';

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
    } satisfies LoginResponse);
  } catch (err) {
    next(err);
  }
}

export async function externalLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email, appPassword, customerEmail } = req.body as Partial<ExternalLoginRequest>;
  if (!email || !appPassword || !customerEmail) {
    res.status(400).json({
      success: false,
      error: 'email, appPassword e customerEmail são obrigatórios',
    } satisfies LoginResponse);
    return;
  }

  try {
    const result = await automationService.externalExecute({ email, appPassword, customerEmail });
    res.status(200).json({
      success: result.success,
      message: result.message,
    } satisfies LoginResponse);
  } catch (err) {
    next(err);
  }
}