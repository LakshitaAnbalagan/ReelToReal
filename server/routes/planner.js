import { Router } from 'express';
import { chat, query } from '../controllers/plannerController.js';

const router = Router();

router.post('/query', query);
router.post('/chat', chat);

export default router;
