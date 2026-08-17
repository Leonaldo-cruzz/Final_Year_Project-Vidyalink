import fs from 'node:fs/promises';
import path from 'node:path';
import Certificate from '../models/certificate.model.js';
import verificationService, { normalizeVerificationStatus } from './verification.service.js';
import ApiError from '../utils/ApiError.js';
import { CERTIFICATE_DIRECTORY, CERTIFICATE_PUBLIC_PATH } from '../middleware/certificateUpload.middleware.js';

class CertificateService {
  /**
   * Create a new certificate entry (Student only)
   */
  async createCertificate(userId, certificateData, file) {
    if (!file) {
      throw ApiError.badRequest('Please upload a certificate document (PDF, JPG, or PNG)');
    }

    const certificateFile = {
      originalFileName: file.originalname,
      storedFileName: file.filename,
      fileUrl: `${CERTIFICATE_PUBLIC_PATH}${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    const certificate = await Certificate.create({
      userId,
      title: certificateData.title,
      issuer: certificateData.issuer,
      category: certificateData.category || 'Other',
      issueDate: new Date(certificateData.issueDate),
      expiryDate: certificateData.expiryDate ? new Date(certificateData.expiryDate) : null,
      credentialId: certificateData.credentialId || null,
      credentialUrl: certificateData.credentialUrl || null,
      certificateFile,
      skills: Array.isArray(certificateData.skills) ? certificateData.skills : [],
    });

    return verificationService.attachToTarget(userId, 'CERTIFICATE', certificate);
  }

  /**
   * Get all certificates for a student with filter, search, and sort options
   */
  async getCertificates(userId, { status, search, sort } = {}) {
    const query = { userId };

    const verificationStatus = normalizeVerificationStatus(status);
    if (verificationStatus) {
      query._id = {
        $in: await verificationService.getTargetIdsByStatus(userId, 'CERTIFICATE', verificationStatus),
      };
    }

    // Search by title, issuer, or category
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { issuer: searchRegex },
        { category: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // Default: Latest
    if (sort === 'Oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'Verified First') {
      const certificates = await Certificate.find(query);
      const certificatesWithVerification = await verificationService.attachToTargets(
        userId,
        'CERTIFICATE',
        certificates
      );
      const statusOrder = { VERIFIED: 1, PENDING: 2, CHANGES_REQUESTED: 3, REJECTED: 4 };
      return certificatesWithVerification.sort((a, b) => {
        const orderA = statusOrder[a.verification?.status] || 5;
        const orderB = statusOrder[b.verification?.status] || 5;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    const certificates = await Certificate.find(query).sort(sortOptions);
    return verificationService.attachToTargets(userId, 'CERTIFICATE', certificates);
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(id, userId) {
    const certificate = await Certificate.findOne({ _id: id, userId });
    if (!certificate) {
      throw ApiError.notFound('Certificate not found');
    }
    return verificationService.attachToTarget(userId, 'CERTIFICATE', certificate);
  }

  /**
   * Update existing certificate (Student only)
   */
  async updateCertificate(id, userId, updateData, newFile) {
    const certificate = await Certificate.findOne({ _id: id, userId });
    if (!certificate) {
      throw ApiError.notFound('Certificate not found');
    }

    // Update fields
    if (updateData.title) certificate.title = updateData.title;
    if (updateData.issuer) certificate.issuer = updateData.issuer;
    if (updateData.category) certificate.category = updateData.category;
    if (updateData.issueDate) certificate.issueDate = new Date(updateData.issueDate);
    if (updateData.expiryDate !== undefined) {
      certificate.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null;
    }
    if (updateData.credentialId !== undefined) certificate.credentialId = updateData.credentialId;
    if (updateData.credentialUrl !== undefined) certificate.credentialUrl = updateData.credentialUrl;
    if (Array.isArray(updateData.skills)) certificate.skills = updateData.skills;

    // Handle file replacement if new file is uploaded
    if (newFile) {
      // Delete old file from disk
      if (certificate.certificateFile?.storedFileName) {
        const oldFilePath = path.join(CERTIFICATE_DIRECTORY, certificate.certificateFile.storedFileName);
        try {
          await fs.unlink(oldFilePath);
        } catch {
          // Ignore if old file missing
        }
      }

      certificate.certificateFile = {
        originalFileName: newFile.originalname,
        storedFileName: newFile.filename,
        fileUrl: `${CERTIFICATE_PUBLIC_PATH}${newFile.filename}`,
        fileSize: newFile.size,
        mimeType: newFile.mimetype,
      };
    }

    certificate.updatedAt = new Date();

    await certificate.save();
    return verificationService.attachToTarget(userId, 'CERTIFICATE', certificate);
  }

  /**
   * Delete certificate (Student only)
   */
  async deleteCertificate(id, userId) {
    const certificate = await Certificate.findOne({ _id: id, userId });
    if (!certificate) {
      throw ApiError.notFound('Certificate not found');
    }

    // Delete stored file from disk
    if (certificate.certificateFile?.storedFileName) {
      const filePath = path.join(CERTIFICATE_DIRECTORY, certificate.certificateFile.storedFileName);
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore if file missing
      }
    }

    await Certificate.deleteOne({ _id: id });
    return { message: 'Certificate deleted successfully' };
  }
}

export default new CertificateService();
