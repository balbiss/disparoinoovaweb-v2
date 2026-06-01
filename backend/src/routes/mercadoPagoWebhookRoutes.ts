import { Router } from 'express';
import { handleWebhook } from '../controllers/mercadoPagoWebhookController';

const router = Router();

router.post('/billing/:tenantSlug', handleWebhook);

export default router;
