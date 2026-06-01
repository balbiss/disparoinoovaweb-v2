import { Router } from 'express';
import { createCharge, listCharges, deleteCharge, bulkDeleteCharges, listRecurringCharges, createRecurringCharge, deleteRecurringCharge } from '../controllers/billingChargeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createCharge);
router.get('/', listCharges);
router.post('/bulk-delete', bulkDeleteCharges);
router.delete('/:id', deleteCharge);

// Recurring charges
router.get('/recurring', listRecurringCharges);
router.post('/recurring', createRecurringCharge);
router.delete('/recurring/:id', deleteRecurringCharge);

export default router;
