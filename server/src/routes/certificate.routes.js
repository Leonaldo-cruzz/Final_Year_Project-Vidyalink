import { Router } from 'express';
import certificateController from '../controllers/certificate.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import certificateUpload from '../middleware/certificateUpload.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  certificateListQuerySchema,
  createCertificateRequestSchema,
  updateCertificateRequestSchema,
} from '../validators/certificate.validator.js';

const router = Router();

// Protect all certificate routes for authenticated students
router.use(authenticate);

// Student only operations
router.post(
  '/',
  authorize('student'),
  certificateUpload,
  validate(createCertificateRequestSchema),
  certificateController.createCertificate
);
router.get('/', authorize('student'), validate(certificateListQuerySchema), certificateController.getCertificates);
router.get('/:id', authorize('student'), certificateController.getCertificateById);
router.put(
  '/:id',
  authorize('student'),
  certificateUpload,
  validate(updateCertificateRequestSchema),
  certificateController.updateCertificate
);
router.delete('/:id', authorize('student'), certificateController.deleteCertificate);

export default router;
