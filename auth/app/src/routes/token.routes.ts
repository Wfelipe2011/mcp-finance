import { Router } from 'express';
import { tokenHandler } from '../controllers/token.controller';

const router = Router();

router.post('/', tokenHandler);

export default router;
