import { Router } from 'express'; import { query } from '../controllers/plannerController.js'; const router = Router(); router.post('/query', query); export default router;
