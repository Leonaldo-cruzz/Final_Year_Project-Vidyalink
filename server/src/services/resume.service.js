import fs from 'node:fs/promises';
import path from 'node:path';
import Resume from '../models/resume.model.js';
import verificationService from './verification.service.js';
import ApiError from '../utils/ApiError.js';
import { RESUME_DIRECTORY, RESUME_PUBLIC_PATH } from '../middleware/resumeUpload.middleware.js';

class ResumeService {
  /**
   * Upload or replace student's resume (Business rule: 1 resume per student)
   */
  async saveOrReplaceResume(userId, file) {
    if (!file) {
      throw ApiError.badRequest('Please select a PDF file to upload');
    }

    const fileUrl = `${RESUME_PUBLIC_PATH}${file.filename}`;

    let resume = await Resume.findOne({ userId });

    if (resume) {
      // Remove old file from disk if it exists
      if (resume.storedFileName) {
        const oldFilePath = path.join(RESUME_DIRECTORY, resume.storedFileName);
        try {
          await fs.unlink(oldFilePath);
        } catch {
          // Ignore error if old file was already missing
        }
      }

      // Update existing record
      resume.originalFileName = file.originalname;
      resume.storedFileName = file.filename;
      resume.fileUrl = fileUrl;
      resume.fileSize = file.size;
      resume.mimeType = file.mimetype || 'application/pdf';
      resume.uploadedAt = new Date();
      resume.updatedAt = new Date();

      await resume.save();
    } else {
      // Create new record
      resume = await Resume.create({
        userId,
        originalFileName: file.originalname,
        storedFileName: file.filename,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype || 'application/pdf',
        uploadedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return verificationService.attachToTarget(userId, 'RESUME', resume);
  }

  /**
   * Get student's resume by userId
   */
  async getResume(userId) {
    const resume = await Resume.findOne({ userId });
    return verificationService.attachToTarget(userId, 'RESUME', resume);
  }

  /**
   * Delete student's resume
   */
  async deleteResume(userId) {
    const resume = await Resume.findOne({ userId });

    if (!resume) {
      throw ApiError.notFound('No resume found to delete');
    }

    // Delete stored file from disk
    if (resume.storedFileName) {
      const filePath = path.join(RESUME_DIRECTORY, resume.storedFileName);
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore error if file doesn't exist
      }
    }

    await Resume.deleteOne({ _id: resume._id });

    return { message: 'Resume deleted successfully' };
  }
}

export default new ResumeService();
