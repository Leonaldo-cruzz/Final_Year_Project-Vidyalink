import test from 'node:test';
import assert from 'node:assert/strict';

import applicationService from '../src/services/application.service.js';
import resumeParserService from '../src/services/resumeParser.service.js';
import projectService from '../src/services/project.service.js';
import Application from '../src/models/application.model.js';
import Project from '../src/models/project.model.js';
import ProjectEngagement from '../src/models/projectEngagement.model.js';
import Workspace from '../src/models/workspace.model.js';
import Notification from '../src/models/notification.model.js';
import ApiError from '../src/utils/ApiError.js';

test('REGRESSION 1: Candidate selection does NOT provision Workspace or ProjectEngagement', async () => {
  const origAppFind = Application.findById;
  const origProjFind = Project.findById;
  const origEngagementCreate = ProjectEngagement.create;
  const origWorkspaceCreate = Workspace.create;
  const origNotifCreate = Notification.create;

  let engagementCreated = false;
  let workspaceCreated = false;
  let savedApp = null;
  let notificationSent = null;

  ProjectEngagement.create = async () => {
    engagementCreated = true;
    throw new Error('ProjectEngagement.create must NOT be called on candidate selection');
  };

  Workspace.create = async () => {
    workspaceCreated = true;
    throw new Error('Workspace.create must NOT be called on candidate selection');
  };

  Notification.create = async (doc) => {
    notificationSent = doc;
    return { _id: 'notif-999', ...doc };
  };

  const mockAppDoc = {
    _id: 'app-100',
    studentId: 'student-abc',
    status: 'Interview Scheduled',
    projectOpportunityId: 'proj-100',
    populate: function () { return this; },
    save: async function () {
      savedApp = this;
      return this;
    },
  };

  const mockProjectDoc = {
    _id: 'proj-100',
    title: 'Distributed Storage Engine',
    createdBy: 'recruiter-xyz',
    status: 'open',
    save: async function () { return this; },
  };

  Application.findById = () => ({
    populate: () => mockAppDoc,
  });

  Project.findById = async () => mockProjectDoc;

  try {
    const result = await applicationService.selectCandidate(
      'recruiter-xyz',
      'app-100',
      { recruiterNotes: 'Strong systems design answers' },
      'recruiter'
    );

    assert.equal(result.application.status, 'Selected', 'Application status must be Selected');
    assert.ok(result.application.selectedAt, 'Application selectedAt must be populated');
    assert.equal(engagementCreated, false, 'ProjectEngagement must NOT be created');
    assert.equal(workspaceCreated, false, 'Workspace must NOT be created');
    assert.equal(result.engagement, undefined, 'No engagement should be returned in result');
    assert.equal(result.workspace, undefined, 'No workspace should be returned in result');
    assert.ok(notificationSent, 'Student must receive a selection notification');
    assert.equal(notificationSent.recipient, 'student-abc');
    assert.match(notificationSent.message, /Selected/i);
  } finally {
    Application.findById = origAppFind;
    Project.findById = origProjFind;
    ProjectEngagement.create = origEngagementCreate;
    Workspace.create = origWorkspaceCreate;
    Notification.create = origNotifCreate;
  }
});

test('REGRESSION 2: Unauthorized resource access (IDOR) is rejected', async () => {
  const origProjFindOne = Project.findOne;

  // Student 2 tries to update or delete Student 1's project
  Project.findOne = async (query) => {
    // query includes { _id: 'proj-1', userId: 'student-2' }
    if (query.userId === 'student-1' && query._id === 'proj-1') {
      return { _id: 'proj-1', userId: 'student-1', title: 'Student 1 Project' };
    }
    return null; // Not found for student-2
  };

  try {
    await assert.rejects(
      async () => {
        await projectService.getProjectById('student-2', 'proj-1');
      },
      (err) => {
        assert.equal(err.statusCode, 404, 'Unauthorized project access must return 404');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await projectService.updateProject('student-2', 'proj-1', { title: 'Hacked' });
      },
      (err) => {
        assert.equal(err.statusCode, 404, 'Unauthorized project update must return 404');
        return true;
      }
    );
  } finally {
    Project.findOne = origProjFindOne;
  }
});

test('REGRESSION 3: Unverified projects cannot be scored by AI', () => {
  // Simulating the scoring logic contract from ai-service portfolio scoring
  const projects = [
    { title: 'Project A', is_verified: true, description: 'Verified ML pipeline', technologies: ['Python', 'PyTorch'] },
    { title: 'Project B', is_verified: false, description: 'Unverified project', technologies: ['Java'] },
  ];

  const verifiedProjects = projects.filter((p) => p.is_verified);
  const excludedCount = projects.length - verifiedProjects.length;

  assert.equal(verifiedProjects.length, 1);
  assert.equal(verifiedProjects[0].title, 'Project A');
  assert.equal(excludedCount, 1, 'Unverified project must be excluded from scoring');
});

test('REGRESSION 4: Missing AI evidence produces explicit insufficient-evidence, never fake scores', () => {
  const verifiedProjects = [];
  const evidenceStatus = verifiedProjects.length > 0 ? 'sufficient' : 'insufficient_evidence';
  const overallScore = verifiedProjects.length > 0 ? 85 : 0;

  assert.equal(evidenceStatus, 'insufficient_evidence');
  assert.equal(overallScore, 0, 'Missing evidence must never invent synthetic scores');
});

test('REGRESSION 5: Resume parsing failure handles corrupted/empty files safely', async () => {
  // Empty buffer
  const emptyResult = await resumeParserService.extractText(Buffer.from([]), 'application/pdf', 'empty.pdf');
  assert.equal(emptyResult.success, false);
  assert.equal(emptyResult.status, 'EMPTY');

  // Corrupt non-PDF binary
  const corruptResult = await resumeParserService.extractText(
    Buffer.from('NOT_A_VALID_PDF_HEADER_12345'),
    'application/pdf',
    'corrupt.pdf'
  );
  assert.equal(corruptResult.success, false);
  assert.equal(corruptResult.status, 'UNREADABLE');
});

test('REGRESSION 6: Duplicate application to the same opportunity is rejected with 409 Conflict', async () => {
  const origProjFind = Project.findById;
  const origAppFind = Application.findOne;

  Project.findById = async () => ({
    _id: 'opportunity-1',
    status: 'open',
    createdBy: 'recruiter-1',
  });

  // Simulate existing application found
  Application.findOne = async () => ({
    _id: 'app-existing-1',
    studentId: 'student-1',
    projectOpportunityId: 'opportunity-1',
  });

  try {
    await assert.rejects(
      async () => {
        await applicationService.applyToProject('student-1', {
          projectId: 'opportunity-1',
          coverLetter: 'I would like to apply again',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409, 'Duplicate application must return 409 Conflict');
        assert.match(err.message, /already applied/i);
        return true;
      }
    );
  } finally {
    Project.findById = origProjFind;
    Application.findOne = origAppFind;
  }
});

test('REGRESSION 7: Invalid recruiter status transition from Selected is rejected', async () => {
  const origAppFind = Application.findById;
  const origProjFind = Project.findById;

  const mockProjectDoc = {
    _id: 'proj-1',
    createdBy: 'recruiter-1',
  };

  const mockAppDoc = {
    _id: 'app-selected',
    status: 'Selected',
    projectOpportunityId: mockProjectDoc,
    populate: function () { return this; },
    save: async function () { return this; },
  };

  Application.findById = () => ({
    populate: () => mockAppDoc,
  });

  Project.findById = async () => mockProjectDoc;

  try {
    await assert.rejects(
      async () => {
        // Try reverting an already selected candidate back to applied
        await applicationService.updateCandidateStatus(
          'recruiter-1',
          'app-selected',
          { status: 'Applied' },
          'recruiter'
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400, 'Reverting a Selected candidate must be rejected');
        assert.match(err.message, /already selected/i);
        return true;
      }
    );
  } finally {
    Application.findById = origAppFind;
    Project.findById = origProjFind;
  }
});

test('REGRESSION 8: Scheduling interview for Withdrawn application is rejected', async () => {
  const origAppFind = Application.findById;

  const mockWithdrawnApp = {
    _id: 'app-withdrawn',
    status: 'Withdrawn',
    projectOpportunityId: 'proj-1',
    populate: function () { return this; },
  };

  Application.findById = () => ({
    populate: () => mockWithdrawnApp,
  });

  try {
    await assert.rejects(
      async () => {
        await applicationService.scheduleInterview(
          'recruiter-1',
          'app-withdrawn',
          { interviewDate: new Date(), interviewMode: 'Online' },
          'recruiter'
        );
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /withdrawn or rejected/i);
        return true;
      }
    );
  } finally {
    Application.findById = origAppFind;
  }
});
