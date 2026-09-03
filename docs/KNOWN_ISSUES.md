# Known issues — Sprint 12 audit

Only verified findings are listed below. No production credentials, data, or mock values were used to classify them.

| Severity | Finding | Impact / required follow-up |
| --- | --- | --- |
| CRITICAL | Faculty portfolio verification is not implemented. There is no verification request model, API, service, or dashboard action that can approve, reject, request changes, or resubmit a student portfolio. | The required student-to-faculty verification workflow cannot run. Implement it as a dedicated future sprint before claiming verified portfolio coverage. |
| CRITICAL | AI portfolio evaluation, skill extraction/gap, readiness, recommendations, and ATS analysis are not implemented in the mounted backend. `ai-service/README.md` identifies the service as under development. | No score or AI insight can be safely shown or tested. Configure/build the existing intended AI service first; do not add an unrelated scoring algorithm. |
| CRITICAL | Alumni, recruiter search/shortlisting, notifications, and admin analytics have no persisted backend modules. The current dashboards contain hardcoded presentation data. | These screens cannot meet the end-to-end business workflow or reflect database state. Replace each with an authorized, database-backed module in a later scoped sprint. |
| HIGH | The student-side application submit/list endpoints work, but application management and selection assume recruiter-owned “project opportunities”, while the mounted `Project` model and routes are student-owned portfolio projects. | Recruiter application lookup/status updates cannot complete reliably because ownership fields such as `createdBy`/`user` are not persisted by the current project schema. This is both functionally incompatible and outside this sprint's instruction not to introduce a marketplace/execution workflow. |
| HIGH | Uploaded resume and certificate files are served through the public `/uploads` static mount. | URLs are not protected by JWT/visibility checks. Move downloads behind ownership/visibility-aware endpoints before exposing sensitive documents to recruiters. |
| HIGH | The current branch provides a resume upload flow only; it does not contain an ATS-friendly generated-resume builder or ATS analyzer endpoint. | Resume generation/analysis acceptance tests remain blocked in this branch. |
| MEDIUM | `StudentApplications.jsx` and `ProjectsList.jsx` are not mounted in the active router. The latter was also importing a non-existent `getMyProjects`; that import was repaired during this sprint. | The components do not provide a reachable supported application workflow. Decide their product scope before adding routes. |
| MEDIUM | Frontend build reports a single JavaScript bundle larger than 500 kB after minification. | Build succeeds, but code splitting should be assessed when feature scope is stabilized. |
| LOW | CI or developer environments without `MONGODB_URI_TEST` and without a local `mongod` executable cannot run the API integration cases. | The test harness safely skips those cases rather than using `MONGODB_URI`; configure an isolated `MONGODB_URI_TEST` or install MongoDB for full integration execution. |

## Test evidence — 2026-09-03

- `npm test`: **23 total, 15 passed, 0 failed, 8 skipped**.
- `npm run lint`: passed.
- The integration suite uses isolated test users and clears persisted test models and created upload files after every test.
- The eight skipped tests are intentional and map to the unimplemented modules above; they do not claim coverage for unsupported functionality.
