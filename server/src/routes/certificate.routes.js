import { Router } from 'express';
import certificateController from '../controllers/certificate.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import certificateUpload from '../middleware/certificateUpload.middleware.js';

const router = Router();

// Protect all certificate routes for authenticated students
router.use(authenticate);

// Student only operations
router.post('/', authorize('student'), certificateUpload, certificateController.createCertificate);
router.get('/', authorize('student'), certificateController.getCertificates);
router.get('/:id', authorize('student'), certificateController.getCertificateById);
router.put('/:id', authorize('student'), certificateUpload, certificateController.updateCertificate);
router.delete('/:id', authorize('student'), certificateController.deleteCertificate);

export default router;
