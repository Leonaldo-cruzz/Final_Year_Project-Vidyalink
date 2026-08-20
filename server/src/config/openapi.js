const successResponse = (description = 'Successful response') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiResponse' },
    },
  },
});

const errorResponses = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  409: { $ref: '#/components/responses/Conflict' },
  429: { $ref: '#/components/responses/RateLimited' },
  500: { $ref: '#/components/responses/InternalError' },
};

const protectedOperation = (summary, description, roles, extra = {}) => ({
  summary,
  description: `${description}\n\n**Roles:** ${roles.join(', ')}.`,
  security: [{ bearerAuth: [] }],
  responses: { 200: successResponse(), ...errorResponses },
  ...extra,
});

const idParameter = (name = 'id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  description: 'MongoDB ObjectId',
});

const jsonRequest = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const multipartRequest = (properties, required = []) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: { type: 'object', properties, required },
    },
  },
});

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'VidyaLink API',
    version: '1.0.0',
    description: 'REST API for VidyaLink student portfolios, project opportunities, and verification workflows. All responses use the existing `ApiResponse` / `ApiError` envelope.',
  },
  servers: [{ url: '/api/v1', description: 'Current API server' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Profile' },
    { name: 'Resume' },
    { name: 'Certificates' },
    { name: 'Projects' },
    { name: 'GitHub' },
    { name: 'Portfolio' },
    { name: 'Applications' },
    { name: 'Workspaces' },
    { name: 'Milestones' },
    { name: 'Engagements' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Get service health',
        description: 'Public status endpoint. It reports service name, environment, uptime, timestamp, and database connection state without secrets or connection strings.',
        responses: { 200: successResponse('Service is healthy') },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register an account',
        description: 'Public. Accepted roles are `student`, `faculty`, `alumni`, and `recruiter`; `admin` cannot be self-registered.',
        requestBody: jsonRequest({ $ref: '#/components/schemas/RegisterRequest' }, {
          fullName: 'Asha Sharma', email: 'asha@example.test', password: 'Example#Pass1', role: 'student',
        }),
        responses: { 201: successResponse('Registration successful'), 400: errorResponses[400], 409: errorResponses[409], 500: errorResponses[500] },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in',
        description: 'Public. Sets the rotated refresh token as an HTTP-only cookie. The JSON body returns an access token and sanitized user only; it never returns a refresh token.',
        requestBody: jsonRequest({ $ref: '#/components/schemas/LoginRequest' }, { email: 'asha@example.test', password: 'Example#Pass1' }),
        responses: { 200: successResponse('Login successful'), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403], 500: errorResponses[500] },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh an access token',
        description: 'Public when a valid `refreshToken` HTTP-only cookie is present. A refresh token may be supplied in the request body for non-browser clients, but is never returned in JSON.',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string', writeOnly: true } } } } } },
        responses: { 200: successResponse('Token refreshed successfully'), 401: errorResponses[401], 403: errorResponses[403], 500: errorResponses[500] },
      },
    },
    '/auth/logout': {
      post: protectedOperation('Log out', 'Revokes the stored refresh-token hash and clears the refresh-token cookie.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']),
    },
    '/auth/me': {
      get: protectedOperation('Get current user', 'Returns the authenticated user without password or refresh token fields.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']),
    },
    '/profile': {
      post: protectedOperation('Create profile', 'Creates the authenticated user\'s one profile.', ['student', 'faculty', 'recruiter', 'alumni', 'admin'], {
        requestBody: jsonRequest({ $ref: '#/components/schemas/ProfileInput' }),
        responses: { 201: successResponse('Profile created successfully'), ...errorResponses },
      }),
      get: protectedOperation('Get own profile', 'Returns only the authenticated user\'s profile.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']),
      patch: protectedOperation('Update own profile', 'Updates allowed profile fields for the authenticated user.', ['student', 'faculty', 'recruiter', 'alumni', 'admin'], {
        requestBody: jsonRequest({ $ref: '#/components/schemas/ProfileInput' }),
      }),
      delete: protectedOperation('Delete own profile', 'Deletes only the authenticated user\'s profile.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']),
    },
    '/profile/me': {
      get: protectedOperation('Get own profile (alias)', 'Alias of `GET /profile` retained for client compatibility.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']),
    },
    '/profile/photo': {
      post: protectedOperation('Upload profile photo', 'Uploads a JPG, PNG, or WEBP profile picture for an existing profile.', ['student', 'faculty', 'recruiter', 'alumni', 'admin'], {
        requestBody: multipartRequest({ photo: { type: 'string', format: 'binary' } }, ['photo']),
      }),
    },
    '/resume': {
      post: protectedOperation('Upload resume', 'Creates a student resume. Only PDF files up to 5 MB are accepted.', ['student'], {
        requestBody: multipartRequest({ resume: { type: 'string', format: 'binary' } }, ['resume']),
        responses: { 201: successResponse('Resume uploaded successfully'), ...errorResponses },
      }),
      get: protectedOperation('Get own resume', 'Returns the current student resume, or `data: null` when none has been uploaded.', ['student']),
      put: protectedOperation('Replace resume', 'Replaces the existing student resume. Only PDF files up to 5 MB are accepted.', ['student'], {
        requestBody: multipartRequest({ resume: { type: 'string', format: 'binary' } }, ['resume']),
      }),
      delete: protectedOperation('Delete resume', 'Deletes the authenticated student\'s resume.', ['student']),
    },
    '/certificates': {
      post: protectedOperation('Create certificate', 'Uploads a pending certificate. PDF, JPG, and PNG files up to 5 MB are accepted.', ['student'], {
        requestBody: multipartRequest({
          certificateFile: { type: 'string', format: 'binary' }, title: { type: 'string' }, issuer: { type: 'string' }, category: { $ref: '#/components/schemas/CertificateCategory' }, issueDate: { type: 'string', format: 'date' }, credentialUrl: { type: 'string', format: 'uri' }, skills: { type: 'string', description: 'Comma-separated skills' },
        }, ['certificateFile', 'title', 'issuer', 'issueDate']),
        responses: { 201: successResponse('Certificate created successfully'), ...errorResponses },
      }),
      get: protectedOperation('List own certificates', 'Lists only the authenticated student\'s certificates. Filter and sort values are allow-listed.', ['student'], {
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['All', 'Pending', 'Verified', 'Rejected'] } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['Oldest', 'Verified First'] } },
        ],
      }),
    },
    '/certificates/{id}': {
      get: protectedOperation('Get own certificate', 'Fetches a certificate only when it belongs to the authenticated student.', ['student'], { parameters: [idParameter()] }),
      put: protectedOperation('Update own certificate', 'Updates a certificate owned by the authenticated student; supplying a file replaces the previous file and resets verification to Pending.', ['student'], {
        parameters: [idParameter()],
        requestBody: multipartRequest({ certificateFile: { type: 'string', format: 'binary' }, title: { type: 'string' }, issuer: { type: 'string' }, issueDate: { type: 'string', format: 'date' } }),
      }),
      delete: protectedOperation('Delete own certificate', 'Deletes a certificate only when it belongs to the authenticated student.', ['student'], { parameters: [idParameter()] }),
    },
    '/projects': {
      post: protectedOperation('Create project', 'Creates a student project in Pending verification status. Up to six JPEG, PNG, or WEBP screenshots can be included.', ['student'], {
        requestBody: multipartRequest({ title: { type: 'string' }, shortDescription: { type: 'string' }, detailedDescription: { type: 'string' }, category: { $ref: '#/components/schemas/ProjectCategory' }, technologies: { type: 'string', description: 'JSON array or comma-separated names' }, screenshots: { type: 'array', items: { type: 'string', format: 'binary' } } }, ['title', 'shortDescription', 'detailedDescription', 'category', 'technologies']),
        responses: { 201: successResponse('Project created successfully'), ...errorResponses },
      }),
      get: protectedOperation('List own projects', 'Lists only the authenticated student\'s projects; filter and sort values are allow-listed.', ['student'], {
        parameters: [
          { name: 'filter', in: 'query', schema: { type: 'string', enum: ['Verified', 'Pending', 'Completed', 'In Progress', 'Featured'] } },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['Oldest', 'A-Z', 'Recently Updated'] } },
        ],
      }),
    },
    '/projects/{id}': {
      get: protectedOperation('Get own project', 'Fetches a project only when it belongs to the authenticated student.', ['student'], { parameters: [idParameter()] }),
      put: protectedOperation('Update own project', 'Updates a project only when it belongs to the authenticated student.', ['student'], { parameters: [idParameter()], requestBody: multipartRequest({ title: { type: 'string' }, screenshots: { type: 'array', items: { type: 'string', format: 'binary' } } }) }),
      delete: protectedOperation('Delete own project', 'Deletes a project only when it belongs to the authenticated student.', ['student'], { parameters: [idParameter()] }),
    },
    '/github/connect': {
      post: protectedOperation('Connect GitHub', 'Looks up a public GitHub profile and stores a profile snapshot. No GitHub credentials are accepted or returned.', ['student'], { requestBody: jsonRequest({ type: 'object', required: ['githubUsername'], properties: { githubUsername: { type: 'string', example: 'octocat' } } }), responses: { 201: successResponse('GitHub account connected successfully'), ...errorResponses } }),
    },
    '/github/profile': { get: protectedOperation('Get connected GitHub profile', 'Returns the stored public GitHub profile snapshot.', ['student']) },
    '/github/sync': { post: protectedOperation('Sync GitHub profile', 'Refreshes the stored public GitHub profile snapshot.', ['student']) },
    '/github/disconnect': { delete: protectedOperation('Disconnect GitHub', 'Marks the connected GitHub account as disconnected.', ['student']) },
    '/portfolios/verify/{certificateId}': {
      get: {
        tags: ['Portfolio'], summary: 'Verify a portfolio certificate', description: 'Public. Returns verification information without private user fields such as email addresses.',
        parameters: [{ name: 'certificateId', in: 'path', required: true, schema: { type: 'string', example: 'VLC-2026-ABC12345' } }],
        responses: { 200: successResponse('Certificate verified successfully'), 404: errorResponses[404], 500: errorResponses[500] },
      },
    },
    '/portfolios/me': { get: protectedOperation('List own verified portfolios', 'Lists verified portfolios for the authenticated user.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']) },
    '/applications': {
      post: protectedOperation('Apply to a project', 'Creates an application for the authenticated student.', ['student'], { requestBody: jsonRequest({ $ref: '#/components/schemas/ApplicationRequest' }), responses: { 201: successResponse('Application created successfully'), ...errorResponses } }),
    },
    '/applications/my': { get: protectedOperation('List own applications', 'Lists applications submitted by the authenticated student.', ['student']) },
    '/applications/{id}/withdraw': { delete: protectedOperation('Withdraw application', 'Withdraws an application owned by the authenticated student.', ['student'], { parameters: [idParameter()] }) },
    '/applications/project/{projectId}': { get: protectedOperation('List project applications', 'Lists applications for a project the reviewer is allowed to manage.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter('projectId')] }) },
    '/applications/{id}/status': { patch: protectedOperation('Update application status', 'Updates an application status.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()], requestBody: jsonRequest({ type: 'object', required: ['status'], properties: { status: { type: 'string', example: 'Shortlisted' }, recruiterNotes: { type: 'string' } } }) }) },
    '/applications/{id}/interview': { patch: protectedOperation('Schedule interview', 'Schedules an interview on an application.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()], requestBody: jsonRequest({ type: 'object', required: ['interviewDate', 'interviewMode'], properties: { interviewDate: { type: 'string', format: 'date-time' }, interviewMode: { type: 'string', enum: ['Online', 'In-person'] } } }) }) },
    '/applications/{id}/select': { patch: protectedOperation('Select candidate', 'Selects the student and creates the corresponding workspace where supported.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()] }) },
    '/workspaces': { get: protectedOperation('List user workspaces', 'Lists workspaces visible to the authenticated user.', ['student', 'faculty', 'recruiter', 'alumni', 'admin']) },
    '/workspaces/{id}': { get: protectedOperation('Get workspace', 'Gets a workspace only when the authenticated user is an authorised participant.', ['student', 'faculty', 'recruiter', 'alumni', 'admin'], { parameters: [idParameter()] }) },
    '/milestones/workspace/{workspaceId}': { get: protectedOperation('List workspace milestones', 'Lists milestones visible to an authorised workspace participant.', ['student', 'faculty', 'recruiter', 'admin'], { parameters: [idParameter('workspaceId')] }) },
    '/milestones': { post: protectedOperation('Create milestone', 'Creates a milestone in a workspace.', ['recruiter', 'faculty', 'admin'], { requestBody: jsonRequest({ type: 'object', required: ['workspaceId', 'title', 'description', 'dueDate'], properties: { workspaceId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, dueDate: { type: 'string', format: 'date-time' }, order: { type: 'number' } } }), responses: { 201: successResponse('Milestone created successfully'), ...errorResponses } }) },
    '/milestones/{id}': { patch: protectedOperation('Update milestone', 'Updates a milestone owned by an authorised reviewer.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()] }), delete: protectedOperation('Delete milestone', 'Deletes a milestone owned by an authorised reviewer.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()] }) },
    '/milestones/{id}/submit': { post: protectedOperation('Submit deliverable', 'Submits a deliverable URL for a milestone assigned to the student.', ['student'], { parameters: [idParameter()], requestBody: jsonRequest({ type: 'object', required: ['deliverableUrl'], properties: { deliverableUrl: { type: 'string', format: 'uri' }, deliverableNotes: { type: 'string' } } }) }) },
    '/milestones/{id}/verify': { post: protectedOperation('Verify milestone', 'Verifies or rejects a submitted milestone.', ['recruiter', 'faculty', 'admin'], { parameters: [idParameter()], requestBody: jsonRequest({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['verified', 'rejected'] }, feedback: { type: 'string' } } }) }) },
    '/engagements': { post: protectedOperation('Create project engagement', 'Creates an engagement between a project opportunity and a student.', ['recruiter'], { requestBody: jsonRequest({ $ref: '#/components/schemas/EngagementInput' }), responses: { 201: successResponse('Project engagement created successfully'), ...errorResponses } }) },
    '/engagements/student': { get: protectedOperation('List student engagements', 'Lists project engagements assigned to the authenticated student.', ['student']) },
    '/engagements/recruiter': { get: protectedOperation('List recruiter engagements', 'Lists project engagements managed by the authenticated recruiter.', ['recruiter']) },
    '/engagements/faculty': { get: protectedOperation('List faculty engagements', 'Lists project engagements visible to the authenticated faculty member.', ['faculty']) },
    '/engagements/{id}': {
      get: protectedOperation('Get engagement', 'Gets an engagement when the authenticated user is a participant.', ['student', 'faculty', 'recruiter']),
      patch: protectedOperation('Update engagement', 'Updates an engagement when the authenticated user is an authorised recruiter or faculty member.', ['recruiter', 'faculty'], { requestBody: jsonRequest({ $ref: '#/components/schemas/EngagementInput' }) }),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Send the short-lived access token as `Authorization: Bearer <token>`.' },
    },
    schemas: {
      ApiResponse: { type: 'object', required: ['success', 'statusCode', 'message', 'data'], properties: { success: { type: 'boolean', example: true }, statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Success' }, data: { nullable: true } } },
      ApiError: { type: 'object', required: ['success', 'statusCode', 'message', 'errors'], properties: { success: { type: 'boolean', example: false }, statusCode: { type: 'integer', example: 400 }, message: { type: 'string', example: 'Validation failed' }, errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } } } },
      RegisterRequest: { type: 'object', required: ['fullName', 'email', 'password'], properties: { fullName: { type: 'string', minLength: 3, maxLength: 100 }, email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password', writeOnly: true, minLength: 8 }, role: { type: 'string', enum: ['student', 'faculty', 'alumni', 'recruiter'], default: 'student' }, college: { type: 'string' }, branch: { type: 'string' }, graduationYear: { type: 'integer' } } },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password', writeOnly: true } } },
      ProfileInput: { type: 'object', properties: { fullName: { type: 'string' }, college: { type: 'string' }, degree: { type: 'string' }, branch: { type: 'string' }, graduationYear: { type: 'integer' }, currentYear: { type: 'integer' }, headline: { type: 'string' }, bio: { type: 'string' }, cgpa: { type: 'number' }, skills: { type: 'array', items: { type: 'string' } }, github: { type: 'string', format: 'uri' }, linkedin: { type: 'string', format: 'uri' }, portfolio: { type: 'string', format: 'uri' } } },
      CertificateCategory: { type: 'string', enum: ['Internship', 'Course', 'Hackathon', 'Workshop', 'Competition', 'Research', 'Cloud Certification', 'Other'] },
      ProjectCategory: { type: 'string', enum: ['Web Development', 'Mobile App', 'AI / ML', 'Cloud', 'Cyber Security', 'IoT', 'Blockchain', 'Desktop Application', 'Research', 'Other'] },
      ApplicationRequest: { type: 'object', required: ['projectOpportunityId', 'coverLetter'], properties: { projectOpportunityId: { type: 'string' }, coverLetter: { type: 'string', minLength: 10 }, resumeSnapshot: { type: 'string', format: 'uri' }, githubSnapshot: { type: 'string', format: 'uri' }, portfolioSnapshot: { type: 'string', format: 'uri' }, skills: { type: 'array', items: { type: 'string' } } } },
      EngagementInput: { type: 'object', properties: { projectOpportunityId: { type: 'string' }, studentId: { type: 'string' }, facultyId: { type: 'string', nullable: true }, status: { type: 'string', enum: ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'] }, progressPercentage: { type: 'number', minimum: 0, maximum: 100 }, currentMilestone: { type: 'string', nullable: true }, startDate: { type: 'string', format: 'date-time' }, expectedEndDate: { type: 'string', format: 'date-time', nullable: true } } },
    },
    responses: {
      BadRequest: { description: 'Validation or request error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      Unauthorized: { description: 'Missing, expired, or invalid access token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      Forbidden: { description: 'Authenticated user does not have the required role or ownership', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      Conflict: { description: 'Resource already exists or operation conflicts with current state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      RateLimited: { description: 'Too many requests', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
      InternalError: { description: 'Unexpected server or external-service error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
    },
  },
};

export default openapiDocument;
