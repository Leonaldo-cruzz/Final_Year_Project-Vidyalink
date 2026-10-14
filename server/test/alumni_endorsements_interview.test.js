import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import mongoose from 'mongoose';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';

const User = (await import('../src/models/user.model.js')).default;
const Endorsement = (await import('../src/models/endorsement.model.js')).default;
const MockInterview = (await import('../src/models/mockInterview.model.js')).default;
const Notification = (await import('../src/models/notification.model.js')).default;
const Application = (await import('../src/models/application.model.js')).default;
const Project = (await import('../src/models/project.model.js')).default;
const endorsementService = (await import('../src/services/endorsement.service.js')).default;
const mockInterviewService = (await import('../src/services/mockInterview.service.js')).default;
const {
  createEndorsementSchema,
  getStudentEndorsementsSchema,
} = await import('../src/validators/endorsement.validator.js');
const {
  scheduleMockInterviewSchema,
  updateMockInterviewStatusSchema,
  submitMockInterviewFeedbackSchema,
} = await import('../src/validators/mockInterview.validator.js');

const TEST_PREFIX = `alumni_test_${Date.now()}`;
let userIdsToClean = [];
let endorsementIdsToClean = [];
let interviewIdsToClean = [];
let notifIdsToClean = [];
let projectIdsToClean = [];
let appIdsToClean = [];

let alumniUser, studentUser, otherStudentUser, recruiterUser, otherAlumniUser;
let testProject;

before(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Alumni 1
  alumniUser = await User.create({
    fullName: `${TEST_PREFIX} Alumni Mentor`,
    email: `${TEST_PREFIX}_alumni@test.edu`,
    password: 'Password123!',
    role: 'alumni',
    college: 'Apex Tech University',
    branch: 'Computer Science',
    graduationYear: 2022,
  });
  userIdsToClean.push(alumniUser._id);

  // Alumni 2 (different alumni)
  otherAlumniUser = await User.create({
    fullName: `${TEST_PREFIX} Other Alumni`,
    email: `${TEST_PREFIX}_other_alumni@test.edu`,
    password: 'Password123!',
    role: 'alumni',
    college: 'Apex Tech University',
  });
  userIdsToClean.push(otherAlumniUser._id);

  // Student 1
  studentUser = await User.create({
    fullName: `${TEST_PREFIX} Student Candidate`,
    email: `${TEST_PREFIX}_student@test.edu`,
    password: 'Password123!',
    role: 'student',
    college: 'Apex Tech University',
    branch: 'Information Technology',
    graduationYear: 2026,
  });
  userIdsToClean.push(studentUser._id);

  // Student 2 (unrelated student)
  otherStudentUser = await User.create({
    fullName: `${TEST_PREFIX} Other Student`,
    email: `${TEST_PREFIX}_other_student@test.edu`,
    password: 'Password123!',
    role: 'student',
    college: 'Apex Tech University',
  });
  userIdsToClean.push(otherStudentUser._id);

  // Recruiter
  recruiterUser = await User.create({
    fullName: `${TEST_PREFIX} Recruiter HR`,
    email: `${TEST_PREFIX}_recruiter@test.edu`,
    password: 'Password123!',
    role: 'recruiter',
  });
  userIdsToClean.push(recruiterUser._id);

  // Create dummy project for recruiter hiring interview test
  testProject = await Project.create({
    userId: studentUser._id,
    title: `${TEST_PREFIX} Job Posting Opportunity`,
    shortDescription: 'Project opportunity for candidate applications.',
    detailedDescription: 'Full project scope for recruiting pipeline validation.',
    category: 'Web Development',
    domain: 'Enterprise',
    technologies: ['React', 'Node.js'],
  });
  projectIdsToClean.push(testProject._id);
});

after(async () => {
  if (endorsementIdsToClean.length > 0) {
    await Endorsement.deleteMany({ _id: { $in: endorsementIdsToClean } });
  }
  if (interviewIdsToClean.length > 0) {
    await MockInterview.deleteMany({ _id: { $in: interviewIdsToClean } });
  }
  if (notifIdsToClean.length > 0) {
    await Notification.deleteMany({ _id: { $in: notifIdsToClean } });
  }
  if (appIdsToClean.length > 0) {
    await Application.deleteMany({ _id: { $in: appIdsToClean } });
  }
  if (projectIdsToClean.length > 0) {
    await Project.deleteMany({ _id: { $in: projectIdsToClean } });
  }
  if (userIdsToClean.length > 0) {
    await User.deleteMany({ _id: { $in: userIdsToClean } });
  }
  await mongoose.disconnect();
});

// ─── PART 1: SKILL ENDORSEMENTS TESTS ──────────────────────────────────────────

test('ALUMNI-END-1: Authorized alumni can endorse a technical skill', async () => {
  const endorsement = await endorsementService.endorseSkill({
    alumniId: alumniUser._id,
    studentId: studentUser._id,
    skill: 'React.js',
    notes: 'Demonstrated outstanding component architecture in capstone review.',
  });

  assert.ok(endorsement._id, 'Endorsement ID should be generated');
  assert.equal(endorsement.skill, 'React.js');
  assert.equal(endorsement.canonicalSkill, 'react.js');
  assert.equal(endorsement.student._id.toString(), studentUser._id.toString());
  assert.equal(endorsement.alumni._id.toString(), alumniUser._id.toString());
  assert.equal(endorsement.status, 'active');
  endorsementIdsToClean.push(endorsement._id);
});

test('ALUMNI-END-2: Endorsement is persisted in MongoDB and retrievable by ID', async () => {
  const saved = await Endorsement.findOne({
    student: studentUser._id,
    skill: 'React.js',
  });
  assert.ok(saved, 'Endorsement must exist in MongoDB');
  assert.equal(saved.canonicalSkill, 'react.js');
  assert.equal(saved.notes, 'Demonstrated outstanding component architecture in capstone review.');
});

test('ALUMNI-END-3: Student can retrieve their received endorsements with alumni metadata', async () => {
  const list = await endorsementService.getStudentEndorsements(studentUser._id);
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 1);
  const found = list.find((e) => e.skill === 'React.js');
  assert.ok(found);
  assert.equal(found.alumni.fullName, alumniUser.fullName);
  assert.equal(found.alumni.college, alumniUser.college);
});

test('ALUMNI-END-4: Unauthorized roles (student, recruiter) cannot endorse skills', async () => {
  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: studentUser._id, // student attempting to endorse
        studentId: otherStudentUser._id,
        skill: 'Node.js',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /Only alumni/i);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: recruiterUser._id, // recruiter attempting to endorse
        studentId: studentUser._id,
        skill: 'Docker',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

test('ALUMNI-END-5: Self-endorsement is rejected with 400 Bad Request', async () => {
  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: alumniUser._id,
        studentId: alumniUser._id,
        skill: 'Python',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Self-endorsement/i);
      return true;
    }
  );
});

test('ALUMNI-END-6: Duplicate endorsement for the same student and skill by the same alumni is rejected with 409 Conflict', async () => {
  // Attempting to endorse React.js again (even with different casing 'react.js')
  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: alumniUser._id,
        studentId: studentUser._id,
        skill: 'react.js',
        notes: 'Duplicate attempt with lowercase casing',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /already endorsed/i);
      return true;
    }
  );
});

test('ALUMNI-END-7: Invalid skill (empty or whitespace) and malformed IDs are rejected', async () => {
  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: alumniUser._id,
        studentId: studentUser._id,
        skill: '   ',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await endorsementService.endorseSkill({
        alumniId: 'invalid-alumni-id',
        studentId: studentUser._id,
        skill: 'GraphQL',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );

  // Schema validation checks
  const parsedInvalid = createEndorsementSchema.safeParse({
    body: { skill: '' },
  });
  assert.equal(parsedInvalid.success, false);

  const parsedValid = createEndorsementSchema.safeParse({
    body: { skill: 'TypeScript', notes: 'Solid typing practice' },
  });
  assert.equal(parsedValid.success, true);
});

test('ALUMNI-END-8: Student notification is generated upon successful endorsement persistence', async () => {
  const notif = await Notification.findOne({
    recipient: studentUser._id,
    sender: alumniUser._id,
    type: 'endorsement',
  });
  assert.ok(notif, 'Notification must be stored in database');
  assert.match(notif.title, /Skill Endorsement/i);
  assert.match(notif.message, /React\.js/i);
  notifIdsToClean.push(notif._id);
});

// ─── PART 2: MOCK INTERVIEWS & RUBRIC EVALUATION TESTS ─────────────────────────

let createdInterview;

test('ALUMNI-INT-1: Valid mock interview scheduling with future date', async () => {
  const futureDate = new Date(Date.now() + 86400000 * 2); // 2 days in future
  const interview = await mockInterviewService.scheduleInterview({
    requesterId: alumniUser._id,
    requesterRole: 'alumni',
    studentId: studentUser._id,
    scheduledDate: futureDate.toISOString(),
    mode: 'online',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    focusDomain: 'Full Stack System Design',
  });

  assert.ok(interview._id);
  assert.equal(interview.status, 'scheduled');
  assert.equal(interview.mode, 'online');
  assert.equal(interview.meetingLink, 'https://meet.google.com/abc-defg-hij');
  assert.equal(interview.focusDomain, 'Full Stack System Design');
  createdInterview = interview;
  interviewIdsToClean.push(interview._id);
});

test('ALUMNI-INT-2: Counterparty receives a notification upon interview scheduling', async () => {
  const notif = await Notification.findOne({
    recipient: studentUser._id,
    sender: alumniUser._id,
    type: 'interview',
  });
  assert.ok(notif);
  assert.match(notif.title, /Mock Interview Scheduled/i);
  notifIdsToClean.push(notif._id);
});

test('ALUMNI-INT-3: Confirm, reschedule, and cancel lifecycle flows', async () => {
  // Confirm interview
  const confirmed = await mockInterviewService.updateStatus(
    createdInterview._id,
    studentUser._id,
    'student',
    { status: 'confirmed' }
  );
  assert.equal(confirmed.status, 'confirmed');

  // Reschedule interview (future date)
  const newDate = new Date(Date.now() + 86400000 * 4);
  const rescheduled = await mockInterviewService.updateStatus(
    createdInterview._id,
    alumniUser._id,
    'alumni',
    { scheduledDate: newDate.toISOString() }
  );
  assert.equal(
    new Date(rescheduled.scheduledDate).getTime(),
    newDate.getTime()
  );

  // Test temporary interview cancellation
  const tempInterview = await mockInterviewService.scheduleInterview({
    requesterId: alumniUser._id,
    requesterRole: 'alumni',
    studentId: studentUser._id,
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    mode: 'online',
    focusDomain: 'DevOps & CI/CD',
  });
  interviewIdsToClean.push(tempInterview._id);

  const cancelled = await mockInterviewService.updateStatus(
    tempInterview._id,
    studentUser._id,
    'student',
    { status: 'cancelled', cancellationReason: 'Schedule conflict' }
  );
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancellationReason, 'Schedule conflict');

  // Verify cancelled interview cannot be confirmed or rescheduled
  await assert.rejects(
    async () => {
      await mockInterviewService.updateStatus(
        tempInterview._id,
        studentUser._id,
        'student',
        { status: 'confirmed' }
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /cancelled/i);
      return true;
    }
  );
});

test('ALUMNI-INT-4: Past dates and malformed dates are rejected', async () => {
  const pastDate = new Date(Date.now() - 3600000).toISOString();

  await assert.rejects(
    async () => {
      await mockInterviewService.scheduleInterview({
        requesterId: alumniUser._id,
        requesterRole: 'alumni',
        studentId: studentUser._id,
        scheduledDate: pastDate,
        focusDomain: 'Algorithms',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /future/i);
      return true;
    }
  );

  // Zod schema validation rejection
  const invalidSchemaResult = scheduleMockInterviewSchema.safeParse({
    body: {
      studentId: studentUser._id.toString(),
      scheduledDate: pastDate,
      focusDomain: 'Algorithms',
    },
  });
  assert.equal(invalidSchemaResult.success, false);
});

test('ALUMNI-INT-5: Unauthorized participants cannot access or modify another interview', async () => {
  // otherStudentUser is not a participant
  await assert.rejects(
    async () => {
      await mockInterviewService.getInterviewById(
        createdInterview._id,
        otherStudentUser._id,
        'student'
      );
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /not authorized/i);
      return true;
    }
  );

  // otherAlumniUser is not the interviewer
  await assert.rejects(
    async () => {
      await mockInterviewService.updateStatus(
        createdInterview._id,
        otherAlumniUser._id,
        'alumni',
        { status: 'cancelled' }
      );
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

test('ALUMNI-INT-6: Valid rubric evaluation submission calculates overall score server-side', async () => {
  // Rubric: 5 dimensions rated 1 to 5
  // Ratings: Technical (4), Problem-Solving (5), Communication (4), Project (5), Confidence (4)
  // Total sum = 22 / 25
  // Expected overall score = Math.round((22 / 25) * 100) = 88%
  const evaluated = await mockInterviewService.submitEvaluation(
    createdInterview._id,
    alumniUser._id,
    {
      technicalKnowledge: 4,
      problemSolving: 5,
      communication: 4,
      projectUnderstanding: 5,
      confidence: 4,
      strengths: 'Clear explanation of microservices distributed caching and system trade-offs.',
      improvements: 'Recommend practicing database sharding strategies and query indexing benchmarks.',
      privateNotes: 'Candidate is high potential. Recommend fast-track campus placement.',
      feedbackVisibility: 'published',
    }
  );

  assert.equal(evaluated.status, 'completed');
  assert.ok(evaluated.evaluation);
  assert.equal(evaluated.evaluation.overallScore, 88);
  assert.equal(evaluated.evaluation.technicalKnowledge, 4);
  assert.equal(evaluated.evaluation.problemSolving, 5);
  assert.equal(evaluated.evaluation.privateNotes, 'Candidate is high potential. Recommend fast-track campus placement.');
});

test('ALUMNI-INT-7: Invalid or missing rubric ratings (e.g. 0, 6, 3.5, string) are rejected', async () => {
  // Out of range (6)
  await assert.rejects(
    async () => {
      await mockInterviewService.submitEvaluation(
        createdInterview._id,
        alumniUser._id,
        {
          technicalKnowledge: 6, // invalid > 5
          problemSolving: 5,
          communication: 4,
          projectUnderstanding: 4,
          confidence: 4,
          strengths: 'Great technical depth',
          improvements: 'Practice pacing',
        }
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /between 1 and 5/i);
      return true;
    }
  );

  // Decimal / float (3.5)
  await assert.rejects(
    async () => {
      await mockInterviewService.submitEvaluation(
        createdInterview._id,
        alumniUser._id,
        {
          technicalKnowledge: 3.5, // invalid float
          problemSolving: 5,
          communication: 4,
          projectUnderstanding: 4,
          confidence: 4,
          strengths: 'Great technical depth',
          improvements: 'Practice pacing',
        }
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /integer/i);
      return true;
    }
  );

  // Missing dimension
  const zodValidation = submitMockInterviewFeedbackSchema.safeParse({
    params: { id: createdInterview._id.toString() },
    body: {
      technicalKnowledge: 4,
      problemSolving: 4,
      // missing communication
      projectUnderstanding: 4,
      confidence: 4,
      strengths: 'Strong knowledge',
      improvements: 'Keep practicing',
    },
  });
  assert.equal(zodValidation.success, false);
});

test('ALUMNI-INT-8: Student view of interview strips private interviewer notes', async () => {
  const studentView = await mockInterviewService.getInterviewById(
    createdInterview._id,
    studentUser._id,
    'student'
  );

  assert.ok(studentView.evaluation);
  assert.equal(studentView.evaluation.overallScore, 88);
  assert.equal(studentView.evaluation.strengths, 'Clear explanation of microservices distributed caching and system trade-offs.');
  assert.equal(studentView.evaluation.improvements, 'Recommend practicing database sharding strategies and query indexing benchmarks.');
  assert.strictEqual(
    studentView.evaluation.privateNotes,
    undefined,
    'privateNotes MUST be undefined / stripped in student view'
  );
});

test('ALUMNI-INT-9: Interviewer view preserves private interviewer notes', async () => {
  const alumniView = await mockInterviewService.getInterviewById(
    createdInterview._id,
    alumniUser._id,
    'alumni'
  );

  assert.ok(alumniView.evaluation);
  assert.equal(
    alumniView.evaluation.privateNotes,
    'Candidate is high potential. Recommend fast-track campus placement.'
  );
});

test('ALUMNI-INT-10: Recruiter hiring interview workflow remains completely independent and uncorrupted', async () => {
  const recruiterApp = await Application.create({
    projectOpportunityId: testProject._id,
    studentId: studentUser._id,
    recruiterId: recruiterUser._id,
    coverLetter: 'Applying for full-time engineering role at enterprise cloud group.',
    status: 'Interview Scheduled',
    interviewDate: new Date(Date.now() + 86400000 * 5),
    interviewMode: 'Online',
    recruiterNotes: 'Candidate screened well in initial assessment.',
  });
  appIdsToClean.push(recruiterApp._id);

  assert.ok(recruiterApp._id);
  assert.equal(recruiterApp.status, 'Interview Scheduled');
  assert.equal(recruiterApp.interviewMode, 'Online');
  assert.equal(recruiterApp.recruiterNotes, 'Candidate screened well in initial assessment.');

  // Verify mock interview count is unaffected by recruiter application
  const studentMockInterviews = await MockInterview.find({ student: studentUser._id });
  const appRecords = await Application.find({ studentId: studentUser._id });
  assert.ok(studentMockInterviews.length > 0);
  assert.ok(appRecords.length > 0);
});
