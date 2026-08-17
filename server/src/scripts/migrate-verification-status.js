import mongoose from 'mongoose';
import env from '../config/env.js';
import Certificate from '../models/certificate.model.js';
import Project from '../models/project.model.js';
import Verification from '../models/verification.model.js';

const LEGACY_STATUS_MAP = Object.freeze({
  Pending: 'PENDING',
  Verified: 'VERIFIED',
  Rejected: 'REJECTED',
});

const migrateTargetType = async (model, targetType, fieldsToRemove) => {
  const legacyRecords = await model.collection
    .find({ verificationStatus: { $exists: true } })
    .toArray();
  let migrated = 0;

  for (const legacyRecord of legacyRecords) {
    const status = LEGACY_STATUS_MAP[legacyRecord.verificationStatus] || 'PENDING';
    const existingVerification = await Verification.exists({
      studentId: legacyRecord.userId,
      targetType,
      targetId: legacyRecord._id,
    });

    if (!existingVerification) {
      await Verification.create({
        studentId: legacyRecord.userId,
        facultyId: legacyRecord.verifiedBy || null,
        targetType,
        targetId: legacyRecord._id,
        status,
        remarks: legacyRecord.rejectionReason || null,
        verifiedAt: status === 'VERIFIED' ? legacyRecord.updatedAt || new Date() : null,
        createdAt: legacyRecord.createdAt || new Date(),
        updatedAt: legacyRecord.updatedAt || legacyRecord.createdAt || new Date(),
      });
      migrated += 1;
    }
  }

  if (legacyRecords.length) {
    await model.collection.updateMany(
      { verificationStatus: { $exists: true } },
      { $unset: fieldsToRemove }
    );
  }

  return { migrated, cleaned: legacyRecords.length };
};

const run = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);

    const projects = await migrateTargetType(Project, 'PROJECT', { verificationStatus: '' });
    const certificates = await migrateTargetType(Certificate, 'CERTIFICATE', {
      verificationStatus: '',
      verifiedBy: '',
      rejectionReason: '',
    });

    console.log('Verification migration complete', { projects, certificates });
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error('Verification migration failed:', error);
  process.exitCode = 1;
});
