import express, { Request, Response, NextFunction } from 'express';
import routes from './routes';
import { LoginResponse } from './types';

const app = express();

app.use(express.json());
app.use(routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({
    success: false,
    error: 'Falha na automação de login',
  } satisfies LoginResponse);
});

export default app;
