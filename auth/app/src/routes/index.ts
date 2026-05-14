import { Router } from 'express';
import loginRoutes from './login.routes';
import healthRoutes from './health.routes';
import tokenRoutes from './token.routes';

const router = Router();

router.use('/login', loginRoutes);
router.use('/health', healthRoutes);
router.use('/token', tokenRoutes);

export default router;
