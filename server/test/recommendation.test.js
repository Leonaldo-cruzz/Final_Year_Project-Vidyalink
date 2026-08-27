import test from 'node:test';
import assert from 'node:assert/strict';

// Importing server modules loads the existing environment guard. These values
// are test-only placeholders; this suite never opens a database connection.
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';
process.env.JWT_SECRET ||= 'test-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';

const { default: recommendationService, asPublicRecommendation, uniqueStrings } = await import('../src/services/recommendation.service.js');
const { default: aiService } = await import('../src/services/ai.service.js');

test('normalizes and de-duplicates trusted source lists deterministically', () => {
  assert.deepEqual(uniqueStrings(['React', ' Node.js '], ['React', '', null]), ['Node.js', 'React']);
});

test('student ownership is enforced before recommendation generation', () => {
  assert.throws(
    () => recommendationService.assertSelf('student-a', 'student-b'),
    (error) => error.statusCode === 403
  );
  assert.doesNotThrow(() => recommendationService.assertSelf('student-a', 'student-a'));
});

test('serialized recommendations expose no private candidate fields', () => {
  const result = asPublicRecommendation({
    _id: 'recommendation-1',
    targetId: 'alumni-1',
    type: 'ALUMNI_MENTOR',
    matchScore: 91.5,
    reasons: ['Strong React overlap'],
    matchedSkills: ['React'],
    missingSkills: [],
    priority: 'HIGH',
    status: 'ACTIVE',
    algorithmVersion: '1.0',
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    email: 'private@example.com',
    phone: '+919999999999',
  });
  assert.equal(result.entityId, 'alumni-1');
  assert.equal('email' in result, false);
  assert.equal('phone' in result, false);
});

test('Node validates FastAPI results and rejects scores without evidence', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    recommendations: [{
      entityId: 'alumni-1',
      type: 'ALUMNI_MENTOR',
      matchScore: 91.5,
      reasons: ['Strong React overlap'],
      matchedSkills: ['React'],
      missingSkills: [],
      priority: 'HIGH',
      algorithmVersion: '1.0',
      generatedAt: new Date().toISOString(),
    }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const [recommendation] = await aiService.getAlumniRecommendations(
      { studentId: 'student-1', skills: ['React'], portfolioScore: 80 },
      [{ entityId: 'alumni-1', expertise: ['React'], verified: true, active: true, visible: true }]
    );
    assert.equal(recommendation.matchScore, 91.5);
    globalThis.fetch = async () => new Response(JSON.stringify({
      recommendations: [{
        entityId: 'alumni-1',
        type: 'ALUMNI_MENTOR',
        matchScore: 101,
        reasons: [],
        matchedSkills: [],
        missingSkills: [],
        priority: 'HIGH',
        algorithmVersion: '1.0',
        generatedAt: new Date().toISOString(),
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    await assert.rejects(
      () => aiService.getAlumniRecommendations({}, []),
      (error) => error.statusCode === 500
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
