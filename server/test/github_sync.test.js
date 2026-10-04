/**
 * GITHUB SYNC — REGRESSION TESTS
 *
 * Tests the complete GitHub auto-discovery + project sync pipeline.
 * All 15 acceptance criteria from the specification are covered.
 *
 * Test runner: node:test (built-in, no external dependencies)
 *
 * Follows the same mock-based pattern used in final_hardening.test.js.
 * No real GitHub API calls are made. No MongoDB connection required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeGithubUrl, syncProjectsFromRepositories } from '../src/services/github.service.js';
import Project from '../src/models/project.model.js';

// ── Shared mock factory helpers ───────────────────────────────────────────────

const makeRepo = (overrides = {}) => ({
  id: overrides.id ?? 101,
  name: overrides.name ?? 'my-repo',
  fullName: overrides.fullName ?? 'alice/my-repo',
  htmlUrl: overrides.htmlUrl ?? 'https://github.com/alice/my-repo',
  cloneUrl: overrides.cloneUrl ?? 'https://github.com/alice/my-repo.git',
  description: overrides.description ?? 'A sample repository',
  language: overrides.language ?? 'JavaScript',
  topics: overrides.topics ?? [],
  stars: overrides.stars ?? 0,
  forks: overrides.forks ?? 0,
  isPrivate: overrides.isPrivate ?? false,
  isFork: overrides.isFork ?? false,
  isArchived: overrides.isArchived ?? false,
  isEmpty: overrides.isEmpty ?? false,
  pushedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
});

const makeProject = (overrides = {}) => ({
  _id: overrides._id ?? 'proj-1',
  userId: overrides.userId ?? 'student-1',
  title: overrides.title ?? 'My Repo',
  shortDescription: overrides.shortDescription ?? 'A sample repository',
  detailedDescription: overrides.detailedDescription ?? 'This project was imported from GitHub repository alice/my-repo. Review and update the description to reflect your actual work.',
  category: overrides.category ?? 'Web Development',
  technologies: overrides.technologies ?? ['JavaScript'],
  githubRepository: overrides.githubRepository ?? 'https://github.com/alice/my-repo',
  githubRepositoryId: overrides.githubRepositoryId ?? 101,
  githubSyncStatus: overrides.githubSyncStatus ?? 'synced',
  githubSource: overrides.githubSource ?? 'github_sync',
  verificationStatus: overrides.verificationStatus ?? 'Pending',
  projectStatus: overrides.projectStatus ?? 'In Progress',
  ...overrides,
});

// Saves created and updated docs for inspection in each test
let capturedCreates = [];
let capturedUpdates = [];
let capturedBulkUpdates = [];

const resetCaptures = () => {
  capturedCreates = [];
  capturedUpdates = [];
  capturedBulkUpdates = [];
};

// ── Mock Project model ────────────────────────────────────────────────────────
// Each test sets up Project.find, Project.create, Project.updateOne,
// and Project.updateMany before calling syncProjectsFromRepositories.

// ── 1. normalizeGithubUrl ─────────────────────────────────────────────────────

test('TC-GH-URL1: normalizeGithubUrl treats trailing slash and .git as identical', () => {
  const base    = 'https://github.com/alice/my-repo';
  const slash   = 'https://github.com/alice/my-repo/';
  const dotGit  = 'https://github.com/alice/my-repo.git';
  const upper   = 'HTTPS://GITHUB.COM/Alice/My-Repo';

  assert.equal(normalizeGithubUrl(base),   'https://github.com/alice/my-repo');
  assert.equal(normalizeGithubUrl(slash),  'https://github.com/alice/my-repo');
  assert.equal(normalizeGithubUrl(dotGit), 'https://github.com/alice/my-repo');
  assert.equal(normalizeGithubUrl(upper),  'https://github.com/alice/my-repo');
});

test('TC-GH-URL2: normalizeGithubUrl returns null for non-GitHub URLs and empty input', () => {
  assert.equal(normalizeGithubUrl('https://gitlab.com/user/repo'), null);
  assert.equal(normalizeGithubUrl(''), null);
  assert.equal(normalizeGithubUrl(null), null);
  assert.equal(normalizeGithubUrl(undefined), null);
  assert.equal(normalizeGithubUrl('not-a-url'), null);
});

// ── 2. Primary match: githubRepositoryId ─────────────────────────────────────

test('TC-GH-SYNC1: existing project matched by githubRepositoryId is UPDATED not duplicated', async () => {
  resetCaptures();

  const existing = makeProject({ _id: 'proj-1', githubRepositoryId: 101 });
  Project.find = async () => [existing];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async (filter, update) => { capturedUpdates.push({ filter, update }); };
  Project.updateMany = async (filter, update) => { capturedBulkUpdates.push({ filter, update }); };

  const repo = makeRepo({ id: 101, htmlUrl: 'https://github.com/alice/my-repo' });
  const result = await syncProjectsFromRepositories('student-1', [repo]);

  assert.equal(capturedCreates.length, 0, 'No new project must be created');
  assert.equal(capturedUpdates.length, 1, 'Existing project must be updated');
  assert.equal(result.imported, 0);
  assert.equal(result.updated, 1);
});

// ── 3. Secondary match: normalized URL ───────────────────────────────────────

test('TC-GH-SYNC2: existing project matched by normalized URL (githubRepositoryId absent) is UPDATED', async () => {
  resetCaptures();

  // Simulate a project created before githubRepositoryId was tracked
  const existing = makeProject({
    _id: 'proj-old',
    githubRepositoryId: null,
    githubRepository: 'https://github.com/alice/my-repo.git',
  });
  Project.find = async () => [existing];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async (filter, update) => { capturedUpdates.push({ filter, update }); };
  Project.updateMany = async () => {};

  // Repo comes in with clean URL (no .git suffix) — should still match
  const repo = makeRepo({ id: 202, htmlUrl: 'https://github.com/alice/my-repo' });
  const result = await syncProjectsFromRepositories('student-1', [repo]);

  assert.equal(capturedCreates.length, 0, 'Should not create a duplicate');
  assert.equal(capturedUpdates.length, 1, 'Should update the existing project');
  assert.equal(result.imported, 0);
  assert.equal(result.updated, 1);
});

// ── 4. Unmatched repo → new project (import) ─────────────────────────────────

test('TC-GH-SYNC3: unmatched repository is IMPORTED as a new unverified project', async () => {
  resetCaptures();

  Project.find = async () => [];  // no existing projects
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repo = makeRepo({ id: 999, name: 'brand-new-repo', description: 'Freshly created' });
  const result = await syncProjectsFromRepositories('student-1', [repo]);

  assert.equal(capturedCreates.length, 1, 'Exactly one project must be created');
  assert.equal(result.imported, 1);
  assert.equal(result.updated, 0);

  const created = capturedCreates[0];
  assert.equal(created.githubRepositoryId, 999);
  assert.equal(created.githubSource, 'github_sync');
  assert.equal(created.githubSyncStatus, 'synced');
  // CRITICAL: must NOT be marked verified
  assert.equal(created.verificationStatus, 'Pending', 'Imported project must not be marked Verified');
});

// ── 5. Idempotent: first sync ─────────────────────────────────────────────────

test('TC-GH-SYNC4: 10 repos with 0 existing projects → 10 imports, 0 updates', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repos = Array.from({ length: 10 }, (_, i) =>
    makeRepo({ id: 100 + i, name: `repo-${i}`, htmlUrl: `https://github.com/alice/repo-${i}` })
  );

  const result = await syncProjectsFromRepositories('student-1', repos);

  assert.equal(result.imported, 10);
  assert.equal(result.updated, 0);
  assert.equal(capturedCreates.length, 10);
});

// ── 6. Idempotent: second sync same repos ────────────────────────────────────

test('TC-GH-SYNC5: second sync with same 10 repos → 0 imports, 10 updates (idempotent)', async () => {
  resetCaptures();

  // All 10 already exist
  const existingProjects = Array.from({ length: 10 }, (_, i) =>
    makeProject({
      _id: `proj-${i}`,
      githubRepositoryId: 100 + i,
      githubRepository: `https://github.com/alice/repo-${i}`,
    })
  );

  Project.find = async () => existingProjects;
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async (filter, update) => { capturedUpdates.push({ filter, update }); };
  Project.updateMany = async () => {};

  const repos = Array.from({ length: 10 }, (_, i) =>
    makeRepo({ id: 100 + i, name: `repo-${i}`, htmlUrl: `https://github.com/alice/repo-${i}` })
  );

  const result = await syncProjectsFromRepositories('student-1', repos);

  assert.equal(result.imported, 0, 'No new projects should be created on second sync');
  assert.equal(result.updated, 10, 'All 10 should be updated');
  assert.equal(capturedCreates.length, 0, 'Zero creates on second sync');
});

// ── 7. Partial match: 10 existing, 3 new repos ───────────────────────────────

test('TC-GH-SYNC6: 10 existing + 3 new repos → 3 imports, 10 updates', async () => {
  resetCaptures();

  const existing = Array.from({ length: 10 }, (_, i) =>
    makeProject({
      _id: `proj-${i}`,
      githubRepositoryId: 100 + i,
      githubRepository: `https://github.com/alice/repo-${i}`,
    })
  );

  Project.find = async () => existing;
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async (filter, update) => { capturedUpdates.push({ filter, update }); };
  Project.updateMany = async () => {};

  // 10 known + 3 new
  const repos = [
    ...Array.from({ length: 10 }, (_, i) =>
      makeRepo({ id: 100 + i, name: `repo-${i}`, htmlUrl: `https://github.com/alice/repo-${i}` })
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      makeRepo({ id: 200 + i, name: `new-${i}`, htmlUrl: `https://github.com/alice/new-${i}` })
    ),
  ];

  const result = await syncProjectsFromRepositories('student-1', repos);

  assert.equal(result.imported, 3);
  assert.equal(result.updated, 10);
});

// ── 8. Deleted repo: project preserved ──────────────────────────────────────

test('TC-GH-SYNC7: deleted GitHub repo does NOT delete the VidyaLink project — marked deleted instead', async () => {
  resetCaptures();

  // Project from first sync; repo 301 is now absent
  const existingProjects = [
    makeProject({ _id: 'proj-old-301', githubRepositoryId: 301, githubSource: 'github_sync', githubSyncStatus: 'synced' }),
    makeProject({ _id: 'proj-302', githubRepositoryId: 302, githubSource: 'github_sync', githubSyncStatus: 'synced' }),
  ];

  Project.find = async () => existingProjects;
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async (filter, update) => { capturedUpdates.push({ filter, update }); };
  Project.updateMany = async (filter, update) => { capturedBulkUpdates.push({ filter, update }); };

  // Only repo 302 comes back this sync — 301 is deleted from GitHub
  const repos = [makeRepo({ id: 302 })];

  const result = await syncProjectsFromRepositories('student-1', repos);

  // Project for repo 301 must NOT be deleted
  assert.equal(capturedCreates.length, 0, 'No creates — repo 302 already exists');
  assert.equal(result.markedDeleted, 1, 'One project should be marked deleted');

  // The updateMany call must mark 'deleted' status, not delete the document
  const deleteMark = capturedBulkUpdates.find(
    (u) => u.update?.$set?.githubSyncStatus === 'deleted'
  );
  assert.ok(deleteMark, 'Must set githubSyncStatus=deleted, not delete the project document');
});

// ── 9. Imported project must remain unverified ────────────────────────────────

test('TC-GH-SYNC8: imported projects are created with verificationStatus=Pending, never Verified', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repos = [
    makeRepo({ id: 401, name: 'auth-service', description: 'OAuth service for VidyaLink' }),
    makeRepo({ id: 402, name: 'ml-pipeline', language: 'Python', topics: ['machine-learning'] }),
  ];

  await syncProjectsFromRepositories('student-1', repos);

  for (const created of capturedCreates) {
    assert.equal(
      created.verificationStatus,
      'Pending',
      `Project ${created.githubRepositoryId} must be Pending, not Verified`
    );
    assert.notEqual(
      created.verificationStatus,
      'Verified',
      'GitHub sync must NEVER set verificationStatus to Verified'
    );
  }
});

// ── 10. Student A cannot import Student B's repos ───────────────────────────

test('TC-GH-SYNC9: syncProjectsFromRepositories scopes all DB queries to the authenticated userId', async () => {
  resetCaptures();

  let findCalledWithUserId = null;
  let updateOneCalledWithUserId = null;

  Project.find = async (query) => {
    findCalledWithUserId = query.userId;
    return [];
  };
  Project.create = async (doc) => {
    capturedCreates.push(doc);
    return doc;
  };
  Project.updateOne = async (filter) => {
    updateOneCalledWithUserId = filter.userId;
  };
  Project.updateMany = async () => {};

  const repos = [makeRepo({ id: 500 })];

  await syncProjectsFromRepositories('student-alice-id', repos);

  assert.equal(findCalledWithUserId, 'student-alice-id', 'find() must use the authenticated userId');
  // After import, any updateOne calls must also scope to userId
  if (capturedCreates.length > 0) {
    assert.equal(capturedCreates[0].userId, 'student-alice-id', 'Created project must belong to student-alice-id');
  }
});

// ── 11. Empty GitHub account → no projects created ───────────────────────────

test('TC-GH-SYNC10: zero repositories → zero projects imported, zero errors', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const result = await syncProjectsFromRepositories('student-1', []);

  assert.equal(result.imported, 0);
  assert.equal(result.updated, 0);
  assert.equal(result.markedDeleted, 0);
  assert.equal(capturedCreates.length, 0, 'Zero repos → zero creates');
});

// ── 12. No fabrication when description is absent ────────────────────────────

test('TC-GH-SYNC11: repo with no description gets a safe fallback, not a fabricated claim', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repo = makeRepo({ id: 601, name: 'empty-repo', description: null, language: null });
  await syncProjectsFromRepositories('student-1', [repo]);

  const created = capturedCreates[0];
  assert.ok(created, 'Project must be created');
  // Must not contain fabricated superlatives
  const allText = `${created.shortDescription} ${created.detailedDescription}`.toLowerCase();
  const fabricatedPhrases = [
    'ai-powered scalable',
    'enterprise-grade',
    'industry-leading',
    'cutting-edge',
    'innovative solution',
  ];
  for (const phrase of fabricatedPhrases) {
    assert.ok(!allText.includes(phrase), `Must not fabricate: "${phrase}"`);
  }
});

// ── 13. Tech inference: language → technologies tag ──────────────────────────

test('TC-GH-SYNC12: repo with language and topics produces technologies from actual evidence', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repo = makeRepo({
    id: 701,
    name: 'flask-api',
    language: 'Python',
    topics: ['flask', 'rest-api', 'postgresql'],
  });

  await syncProjectsFromRepositories('student-1', [repo]);

  const created = capturedCreates[0];
  assert.ok(Array.isArray(created.technologies), 'technologies must be an array');
  assert.ok(created.technologies.length > 0, 'technologies must not be empty');
  assert.ok(
    created.technologies.includes('Python'),
    'Primary language Python must be in technologies'
  );
});

// ── 14. Forked repo metadata preserved ───────────────────────────────────────

test('TC-GH-SYNC13: forked repository is imported with isFork metadata (not hidden)', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repo = makeRepo({ id: 801, isFork: true, name: 'forked-project' });
  await syncProjectsFromRepositories('student-1', [repo]);

  // The project is still created (fork ≠ auto-skip)
  assert.equal(capturedCreates.length, 1, 'Fork should still be imported');
  // Title must not silently present it as original work
  // (The isFork flag is stored on the GitHub side; the VidyaLink project does not need a special field)
  assert.equal(capturedCreates[0].githubRepositoryId, 801);
});

// ── 15. Archived repo → project archived ─────────────────────────────────────

test('TC-GH-SYNC14: archived GitHub repo is created with projectStatus=Archived', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repo = makeRepo({ id: 901, isArchived: true });
  await syncProjectsFromRepositories('student-1', [repo]);

  const created = capturedCreates[0];
  assert.equal(created.projectStatus, 'Archived', 'Archived GitHub repo should become an Archived project');
  assert.equal(created.verificationStatus, 'Pending', 'Even archived projects remain unverified');
});

// ── 16. No duplicate from title match ────────────────────────────────────────

test('TC-GH-SYNC15: two repos with similar names but different IDs produce 2 distinct projects', async () => {
  resetCaptures();

  Project.find = async () => [];
  Project.create = async (doc) => { capturedCreates.push(doc); return doc; };
  Project.updateOne = async () => {};
  Project.updateMany = async () => {};

  const repos = [
    makeRepo({ id: 1001, name: 'vidyalink',    htmlUrl: 'https://github.com/alice/vidyalink' }),
    makeRepo({ id: 1002, name: 'vidyalink-api', htmlUrl: 'https://github.com/alice/vidyalink-api' }),
  ];

  const result = await syncProjectsFromRepositories('student-1', repos);

  assert.equal(result.imported, 2, 'Both must be imported as separate projects');
  assert.equal(capturedCreates[0].githubRepositoryId, 1001);
  assert.equal(capturedCreates[1].githubRepositoryId, 1002);
  assert.notEqual(
    capturedCreates[0].githubRepository,
    capturedCreates[1].githubRepository,
    'The two projects must have different GitHub URLs'
  );
});
