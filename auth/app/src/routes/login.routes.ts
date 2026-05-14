import { Router } from 'express';
import { loginHandler } from '../controllers/login.controller';

const router = Router();

router.post('/', loginHandler);

export default router;
