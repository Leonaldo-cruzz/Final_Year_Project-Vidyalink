import { Router } from 'express';

import aiController from '../controllers/ai.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();
const analysisRoles = ['student', 'faculty', 'recruiter', 'admin'];

// Safe probe: failure of FastAPI is reported in the response and never blocks Node startup.
router.get('/health', aiController.health);

router.use(authenticate);

router.post('/evaluate', authorize(...analysisRoles), aiController.evaluate);
router.get('/results', authorize(...analysisRoles), aiController.getResults);
router.get('/results/latest', authorize(...analysisRoles), aiController.getLatestResults);
router.get('/results/history', authorize(...analysisRoles), aiController.getHistory);
router.post('/portfolio/evaluate', authorize(...analysisRoles), aiController.evaluatePortfolio);
router.get('/portfolio/evaluation', authorize(...analysisRoles), aiController.getPortfolioEvaluation);
router.get('/portfolio/evaluation/:portfolioId', authorize(...analysisRoles), aiController.getPortfolioEvaluation);
router.post('/ats/analyze', authorize(...analysisRoles), aiController.analyzeATS);
router.post('/skills/extract', authorize(...analysisRoles), aiController.extractSkills);
router.post('/skills/gap', authorize(...analysisRoles), aiController.analyzeSkillGap);
router.post('/github/analyze', authorize(...analysisRoles), aiController.analyzeGithub);
router.post('/portfolio/readiness', authorize(...analysisRoles), aiController.calculateReadiness);
router.get('/recommendations', authorize('student'), aiController.recommendations);
router.post('/recommendations', authorize('student'), aiController.recommendations);

export default router;
