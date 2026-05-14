import { Router } from 'express';
import { tokenHandler } from '../controllers/token.controller';

const router = Router();

router.get('/', tokenHandler);

export default router;
