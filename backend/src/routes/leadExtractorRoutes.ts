import { Router } from 'express';
import { LeadExtractorController } from '../controllers/leadExtractorController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/leads/extract (Google Maps - Legacy)
router.post('/extract', authMiddleware, LeadExtractorController.extractLeads);

// POST /api/leads/extract/instagram
router.post('/extract/instagram', authMiddleware, LeadExtractorController.extractInstagramLeads);

// POST /api/leads/extract/linkedin
router.post('/extract/linkedin', authMiddleware, LeadExtractorController.extractLinkedinLeads);

// POST /api/leads/extract/facebook
router.post('/extract/facebook', authMiddleware, LeadExtractorController.extractFacebookLeads);

export default router;
