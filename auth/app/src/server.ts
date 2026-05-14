import { env } from './config/env';
import app from './app';

app.listen(env.port, () => {
  console.log(`[server] Rodando em http://localhost:${env.port}`);
});
