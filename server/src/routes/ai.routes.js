import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.get('/portfolio-summary', authenticate, authorize('student', 'admin'), aiController.getPortfolioAISummary);
router.get('/portfolio-score', authenticate, authorize('student', 'admin'), aiController.getPortfolioScore);
router.get('/ats-score', authenticate, authorize('student', 'admin'), aiController.getATSScore);
router.get('/github-analytics', authenticate, authorize('student', 'admin'), aiController.getGitHubAnalytics);
router.get('/skill-profile', authenticate, authorize('student', 'admin'), aiController.getSkillProfile);
router.get('/skill-gaps', authenticate, authorize('student', 'admin'), aiController.getSkillGaps);
router.get('/recommendations', authenticate, authorize('student', 'admin'), aiController.getRecommendations);
router.get('/industry-readiness', authenticate, authorize('student', 'admin'), aiController.getIndustryReadiness);

// Public exposure is opt-in at the portfolio document level.
router.get('/public/portfolio/:portfolioId/summary', aiController.getPublicPortfolioAISummary);

export default router;
