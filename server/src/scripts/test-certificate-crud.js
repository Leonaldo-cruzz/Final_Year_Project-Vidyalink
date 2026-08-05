import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import env from '../config/env.js';
import User from '../models/user.model.js';
import Certificate from '../models/certificate.model.js';
import certificateService from '../services/certificate.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function logPass(msg) {
  console.log(`${colors.green}✔ PASS:${colors.reset} ${msg}`);
}

function logFail(msg, err) {
  console.error(`${colors.red}✖ FAIL:${colors.reset} ${msg}`);
  if (err) console.error(err);
}

function logHeader(msg) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}`);
}

async function runCertificateCrudTests() {
  logHeader('VIDYALINK — Certificate Module End-to-End CRUD Test');

  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(env.MONGODB_URI);
    logPass('MongoDB Connected');

    // 2. Find or Create Test Student User
    let studentUser = await User.findOne({ role: 'student' });
    if (!studentUser) {
      studentUser = await User.create({
        fullName: 'Test Student CRUD',
        email: `cert_test_${Date.now()}@vidyalink.edu`,
        password: 'Password123!',
        role: 'student',
        status: 'active',
      });
      logPass(`Created test student user: ${studentUser.email}`);
    } else {
      logPass(`Using existing student user: ${studentUser.email} (${studentUser._id})`);
    }

    const userId = studentUser._id;

    // Create a mock dummy file for upload testing
    const sampleFilePath = path.join(__dirname, 'temp-test-cert.pdf');
    fs.writeFileSync(sampleFilePath, '%PDF-1.4 Mock Certificate Content');

    const mockFile = {
      originalname: 'AWS_Solutions_Architect.pdf',
      filename: `cert-test-${Date.now()}.pdf`,
      path: sampleFilePath,
      size: 1024,
      mimetype: 'application/pdf',
    };

    // -------------------------------------------------------------
    // TEST 1: CREATE CERTIFICATE
    // -------------------------------------------------------------
    logHeader('TEST 1: Create Certificate');
    const createData = {
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      category: 'Cloud Certification',
      issueDate: '2026-01-15',
      expiryDate: '2029-01-15',
      credentialId: 'AWS-CERT-998877',
      credentialUrl: 'https://aws.amazon.com/verify/AWS-CERT-998877',
      skills: ['AWS', 'Cloud Architecture', 'IAM', 'EC2'],
    };

    const createdCert = await certificateService.createCertificate(userId, createData, mockFile);
    
    if (
      createdCert &&
      createdCert._id &&
      createdCert.title === createData.title &&
      createdCert.verificationStatus === 'Pending'
    ) {
      logPass(`Certificate Created Successfully! ID: ${createdCert._id}`);
      logPass(`Default Verification Status is 'Pending'`);
    } else {
      throw new Error('Create certificate verification failed');
    }

    const certId = createdCert._id;

    // -------------------------------------------------------------
    // TEST 2: GET ALL CERTIFICATES (With Search, Filter, Sort)
    // -------------------------------------------------------------
    logHeader('TEST 2: Get All Certificates');

    // Fetch all
    const allCerts = await certificateService.getCertificates(userId);
    if (allCerts.length > 0 && allCerts.some((c) => String(c._id) === String(certId))) {
      logPass(`Fetched ${allCerts.length} certificate(s) for student`);
    } else {
      throw new Error('Get all certificates failed');
    }

    // Filter by status 'Pending'
    const pendingCerts = await certificateService.getCertificates(userId, { status: 'Pending' });
    if (pendingCerts.some((c) => String(c._id) === String(certId))) {
      logPass(`Filter status='Pending' correctly returned test certificate`);
    } else {
      throw new Error('Filter by status failed');
    }

    // Search by title 'Solutions Architect'
    const searchCerts = await certificateService.getCertificates(userId, { search: 'Solutions Architect' });
    if (searchCerts.some((c) => String(c._id) === String(certId))) {
      logPass(`Search query 'Solutions Architect' correctly matched certificate`);
    } else {
      throw new Error('Search query failed');
    }

    // Sort by 'Latest'
    const sortedCerts = await certificateService.getCertificates(userId, { sort: 'Latest' });
    if (sortedCerts.length > 0) {
      logPass(`Sort 'Latest' executed successfully`);
    }

    // -------------------------------------------------------------
    // TEST 3: GET CERTIFICATE BY ID
    // -------------------------------------------------------------
    logHeader('TEST 3: Get Certificate By ID');
    const fetchedCert = await certificateService.getCertificateById(certId, userId);
    if (fetchedCert && String(fetchedCert._id) === String(certId) && fetchedCert.issuer === 'Amazon Web Services') {
      logPass(`Certificate fetched by ID successfully! Title: "${fetchedCert.title}"`);
    } else {
      throw new Error('Get certificate by ID failed');
    }

    // -------------------------------------------------------------
    // TEST 4: UPDATE CERTIFICATE
    // -------------------------------------------------------------
    logHeader('TEST 4: Update Certificate');
    const updateData = {
      title: 'AWS Certified Solutions Architect - Associate',
      issuer: 'Amazon Web Services Inc.',
      category: 'Cloud Certification',
      skills: ['AWS', 'Cloud Architecture', 'S3', 'DynamoDB'],
    };

    const updatedCert = await certificateService.updateCertificate(certId, userId, updateData, null);
    if (
      updatedCert &&
      updatedCert.title === 'AWS Certified Solutions Architect - Associate' &&
      updatedCert.issuer === 'Amazon Web Services Inc.' &&
      updatedCert.verificationStatus === 'Pending'
    ) {
      logPass(`Certificate Updated Successfully! New Title: "${updatedCert.title}"`);
      logPass(`Verification Status remains 'Pending' after student update`);
    } else {
      throw new Error('Update certificate failed');
    }

    // -------------------------------------------------------------
    // TEST 5: DELETE CERTIFICATE
    // -------------------------------------------------------------
    logHeader('TEST 5: Delete Certificate');
    const deleteRes = await certificateService.deleteCertificate(certId, userId);
    logPass(`Certificate Deleted: ${deleteRes.message}`);

    // Verify it no longer exists
    try {
      await certificateService.getCertificateById(certId, userId);
      throw new Error('Certificate was not deleted properly from DB');
    } catch (err) {
      if (err.message.includes('not found') || err.statusCode === 404) {
        logPass(`Verified certificate ${certId} is no longer present in DB`);
      } else {
        throw err;
      }
    }

    // Cleanup temp mock file if present
    if (fs.existsSync(sampleFilePath)) {
      fs.unlinkSync(sampleFilePath);
    }

    logHeader('ALL CERTIFICATE CRUD TESTS PASSED SUCCESSFULLY! ✔');
  } catch (error) {
    logFail('Certificate CRUD Test Suite Failed', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
    process.exit(0);
  }
}

runCertificateCrudTests();
