import { Router } from 'express';
import { loginHandler, externalLoginHandler } from '../controllers/login.controller';

const router = Router();

router.post('/', loginHandler);
router.post('/external', externalLoginHandler);

export default router;
