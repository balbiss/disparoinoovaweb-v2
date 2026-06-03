import { Router } from 'express';
import { createCharge, listCharges, deleteCharge, bulkDeleteCharges, listRecurringCharges, createRecurringCharge, deleteRecurringCharge, updateChargeStatus } from '../controllers/billingChargeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createCharge);
router.get('/', listCharges);
router.post('/bulk-delete', bulkDeleteCharges);
router.delete('/:id', deleteCharge);
router.patch('/:id/status', updateChargeStatus);

// Recurring charges
router.get('/recurring', listRecurringCharges);
router.post('/recurring', createRecurringCharge);
router.delete('/recurring/:id', deleteRecurringCharge);

export default router;
