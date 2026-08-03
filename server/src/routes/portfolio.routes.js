import { Router } from 'express';
import portfolioController from '../controllers/portfolio.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

// Public certificate verification endpoint
router.get('/verify/:certificateId', portfolioController.verifyCertificate);

// Protected endpoint for student's portfolio
router.get('/me', authenticate, portfolioController.getStudentPortfolios);

export default router;
