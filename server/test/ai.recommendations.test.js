import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';
process.env.AI_PROVIDER ||= 'deterministic';

const { AIServiceClient } = await import('../src/services/ai.service.js');
const { AIIntegrationService } = await import('../src/services/aiIntegration.service.js');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

// 1. Authenticated recommendation request succeeds
test('1. authenticated recommendation request generates recommendations from real entities', async () => {
  const studentUser = { _id: '507f1f77bcf86cd799439011', role: 'student' };
  const mockAIClient = {
    getRecommendations: async (req) => {
      assert.equal(req.technical_skills.includes('Python'), true);
      return {
        alumni_mentors: [
          {
            id: 'alumni-1',
            name: 'Priya Patel',
            title: 'Software Engineer',
            organization: 'TechLabs',
            match_score: 75.0,
            matched_signals: ['2 matching technical skills (Python, PostgreSQL)'],
            matched_skills: ['Python', 'PostgreSQL'],
            reason: 'Recommended because of technical skill overlap in Python, PostgreSQL.',
          },
        ],
        recruiter_opportunities: [],
        skills_to_develop: [],
        notes: ['Recommendations are ranked only from actual candidate records supplied in this request.'],
      };
    },
  };

  const service = new AIIntegrationService({ client: mockAIClient });
  service.resolveTarget = async () => ({ studentId: studentUser._id, portfolio: null });
  service.getStudentContext = async () => ({
    student: { fullName: 'Aryan Student' },
    profile: { skills: ['Python', 'PostgreSQL'], interests: ['Web Development'] },
    certificates: [],
  });

  const alumniUser = { _id: 'alumni-1', fullName: 'Priya Patel', college: 'TechLabs' };
  service.models.User.find = (query) => ({
    select: () => ({
      lean: async () => (query.role === 'alumni' ? [alumniUser] : []),
    }),
  });
  service.models.Profile.find = () => ({
    lean: async () => [{ user: 'alumni-1', skills: ['Python', 'PostgreSQL'], headline: 'Software Engineer' }],
  });
  service.models.Project.find = () => ({
    populate: () => ({ lean: async () => [] }),
  });

  const result = await service.getRecommendations(studentUser);
  assert.equal(result.status, 'analyzed');
  assert.equal(result.alumni.length, 1);
  assert.equal(result.alumni[0].alumniId, 'alumni-1');
  assert.equal(result.alumni[0].matchScore, 75.0);
  assert.equal(result.alumni[0].reason.includes('Python'), true);
});

// 2. Unauthorized recommendation request
test('2. unauthorized recommendation request rejects access when user is not a student', async () => {
  const service = new AIIntegrationService();
  service.resolvePortfolio = async () => null;

  await assert.rejects(
    () => service.resolveTarget({ role: 'faculty', _id: '507f1f77bcf86cd799439099' }),
    (error) => error.statusCode === 400 && error.message.includes('studentId or portfolioId is required')
  );
});

// 3. Student receives own recommendations
test('3. student receives recommendations scoped to their own context', async () => {
  const student = { _id: '507f1f77bcf86cd799439011', role: 'student' };
  let passedStudentId = null;

  const service = new AIIntegrationService({
    client: {
      getRecommendations: async () => ({
        alumni_mentors: [],
        recruiter_opportunities: [],
        skills_to_develop: [],
        notes: [],
      }),
    },
  });

  service.resolveTarget = async (user) => {
    passedStudentId = user._id;
    return { studentId: user._id, portfolio: null };
  };
  service.getStudentContext = async (id) => {
    assert.equal(id, student._id);
    return { student: { fullName: 'Student Self' }, profile: { skills: ['React'] }, certificates: [] };
  };
  service.models.User.find = () => ({ select: () => ({ lean: async () => [] }) });
  service.models.Profile.find = () => ({ lean: async () => [] });
  service.models.Project.find = () => ({ populate: () => ({ lean: async () => [] }) });

  await service.getRecommendations(student);
  assert.equal(passedStudentId, student._id);
});

// 4. Another student cannot access recommendations
test('4. another student cannot access recommendations of another studentId', async () => {
  const service = new AIIntegrationService();
  const caller = { _id: '507f1f77bcf86cd799439011', role: 'student' };
  const targetOther = { studentId: '507f1f77bcf86cd799439099' };

  await assert.rejects(
    () => service.resolveTarget(caller, targetOther),
    (error) => error.statusCode === 403 && error.message.includes('Students may only analyze their own records')
  );
});

// 5. Actual alumni matching
test('5. actual alumni matching returns signals, matchScore, and transparent reason', async () => {
  const mockAI = {
    getRecommendations: async () => ({
      alumni_mentors: [
        {
          id: 'alm-55',
          name: 'Vikram Mehta',
          title: 'Lead Architect',
          organization: 'Apex Systems',
          match_score: 84.0,
          matched_signals: ['3 matching technical skills (Python, Docker, SQL)', 'Matching domain/career interest (Cloud)'],
          matched_skills: ['Python', 'Docker', 'SQL'],
          reason: 'Recommended because of strong overlap in Python, Docker, SQL and shared interests in Cloud.',
        },
      ],
      recruiter_opportunities: [],
      skills_to_develop: [],
      notes: [],
    }),
  };
  const service = new AIIntegrationService({ client: mockAI });
  service.resolveTarget = async () => ({ studentId: 'stu-1', portfolio: null });
  service.getStudentContext = async () => ({
    student: { fullName: 'Vikram Fan' },
    profile: { skills: ['Python', 'Docker', 'SQL'], interests: ['Cloud'] },
    certificates: [],
  });
  service.models.User.find = () => ({ select: () => ({ lean: async () => [{ _id: 'alm-55', fullName: 'Vikram Mehta' }] }) });
  service.models.Profile.find = () => ({ lean: async () => [{ user: 'alm-55', headline: 'Lead Architect' }] });
  service.models.Project.find = () => ({ populate: () => ({ lean: async () => [] }) });

  const result = await service.getRecommendations({ _id: 'stu-1', role: 'student' });
  assert.equal(result.alumni.length, 1);
  assert.equal(result.alumni[0].matchScore, 84.0);
  assert.equal(result.alumni[0].matchedSignals.length, 2);
  assert.equal(result.alumni[0].reason.startsWith('Recommended because of'), true);
});

// 6. Actual opportunity matching
test('6. actual opportunity matching returns opportunityId, matchedSkills, and missingSkills', async () => {
  const mockAI = {
    getRecommendations: async () => ({
      alumni_mentors: [],
      recruiter_opportunities: [
        {
          id: 'opp-77',
          name: 'Full Stack Engineer',
          title: 'Web Development',
          organization: 'DevCorp',
          match_score: 80.0,
          matched_skills: ['JavaScript', 'React', 'Node.js'],
          missing_skills: ['TypeScript', 'Docker'],
          matched_signals: ['3 required skills matched', '2 skills to develop'],
          reason: 'Recommended because it matches required skills (JavaScript, React, Node.js); offers opportunity to develop Docker, TypeScript.',
        },
      ],
      skills_to_develop: [{ skill: 'TypeScript', priority: 'high', reason: 'Target skill' }],
      notes: [],
    }),
  };
  const service = new AIIntegrationService({ client: mockAI });
  service.resolveTarget = async () => ({ studentId: 'stu-2', portfolio: null });
  service.getStudentContext = async () => ({
    student: { fullName: 'Full Stack Student' },
    profile: { skills: ['JavaScript', 'React', 'Node.js'] },
    certificates: [],
  });
  service.models.User.find = () => ({ select: () => ({ lean: async () => [] }) });
  service.models.Profile.find = () => ({ lean: async () => [] });
  service.models.Project.find = () => ({ populate: () => ({ lean: async () => [{ _id: 'opp-77', title: 'Full Stack Engineer' }] }) });

  const result = await service.getRecommendations({ _id: 'stu-2', role: 'student' });
  assert.equal(result.opportunities.length, 1);
  const opp = result.opportunities[0];
  assert.equal(opp.opportunityId, 'opp-77');
  assert.deepEqual(opp.matchedSkills, ['JavaScript', 'React', 'Node.js']);
  assert.deepEqual(opp.missingSkills, ['TypeScript', 'Docker']);
  assert.equal(opp.matchScore, 80.0);
});

// 7. Empty recommendation result
test('7. empty recommendation result when candidates have no overlap', async () => {
  const mockAI = {
    getRecommendations: async () => ({
      alumni_mentors: [],
      recruiter_opportunities: [],
      skills_to_develop: [],
      notes: [
        'No matching alumni found based on current skills and interests.',
        'No matching opportunities available based on current skills.',
      ],
    }),
  };
  const service = new AIIntegrationService({ client: mockAI });
  service.resolveTarget = async () => ({ studentId: 'stu-3', portfolio: null });
  service.getStudentContext = async () => ({
    student: { fullName: 'New Student' },
    profile: { skills: [] },
    certificates: [],
  });
  service.models.User.find = () => ({ select: () => ({ lean: async () => [] }) });
  service.models.Profile.find = () => ({ lean: async () => [] });
  service.models.Project.find = () => ({ populate: () => ({ lean: async () => [] }) });

  const result = await service.getRecommendations({ _id: 'stu-3', role: 'student' });
  assert.deepEqual(result.alumni, []);
  assert.deepEqual(result.opportunities, []);
  assert.equal(result.notes.some((n) => n.includes('No matching alumni found')), true);
});

// 8. FastAPI failure
test('8. FastAPI failure is handled gracefully with appropriate gateway error', async () => {
  globalThis.fetch = async () => jsonResponse({ detail: 'Internal server error' }, 500);

  const client = new AIServiceClient({ baseUrl: 'http://ai.test' });
  await assert.rejects(
    () => client.getRecommendations({}),
    (error) => error.statusCode === 502 && error.message.includes('AI service rejected the request')
  );
});

// 9. Malformed AI response
test('9. malformed AI response is rejected before returning to caller', async () => {
  // match_score is over 100 or missing required properties
  globalThis.fetch = async () => jsonResponse({
    alumni_mentors: [{ id: 'alm-bad', name: 'Bad Score', match_score: 150.0 }],
  });

  const client = new AIServiceClient({ baseUrl: 'http://ai.test' });
  await assert.rejects(
    () => client.getRecommendations({}),
    (error) => error.statusCode === 502 && error.message.includes('Recommendation')
  );
});
