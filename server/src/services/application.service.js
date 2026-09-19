import Application from '../models/application.model.js';
import Project from '../models/project.model.js';
import ProjectEngagement from '../models/projectEngagement.model.js';
import Workspace from '../models/workspace.model.js';
import Portfolio from '../models/portfolio.model.js';
import AIEvaluation from '../models/aiEvaluation.model.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class ApplicationService {
  async applyToProject(studentId, data) {
    const projectId = data.projectOpportunityId || data.projectId;
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Check project status and deadline
    if (project.status === 'closed' || project.status === 'completed') {
      throw ApiError.badRequest('Applications are closed for this project');
    }

    if (project.deadline && new Date(project.deadline) < new Date()) {
      throw ApiError.badRequest('The application deadline for this project has passed');
    }

    // Prevent duplicate application
    const existingApp = await Application.findOne({
      $or: [
        { projectOpportunityId: projectId, studentId },
        { project: projectId, student: studentId },
      ],
    });

    if (existingApp) {
      throw ApiError.conflict('You have already applied to this project');
    }

    const coverLetter = data.coverLetter || data.pitch;
    const resumeSnapshot = data.resumeSnapshot || data.resumeUrl;
    const githubSnapshot = data.githubSnapshot || data.githubUrl;

    const application = await Application.create({
      projectOpportunityId: projectId,
      project: projectId,
      studentId,
      student: studentId,
      recruiterId: project.createdBy || project.user,
      coverLetter,
      pitch: coverLetter,
      resumeSnapshot,
      resumeUrl: resumeSnapshot,
      githubSnapshot,
      githubUrl: githubSnapshot,
      portfolioSnapshot: data.portfolioSnapshot || null,
      skills: data.skills || [],
      status: 'Applied',
    });

    const recruiterId = project.createdBy || project.user;
    if (recruiterId) {
      await notificationService.createNotification({
        recipient: recruiterId,
        sender: studentId,
        type: 'application',
        title: 'New Applicant for Project',
        message: `A student has submitted an application for "${project.title}".`,
        link: '/recruiter/applicants',
        metadata: { applicationId: application._id, projectId: project._id },
      });
    }

    return application;
  }

  async getStudentApplications(studentId) {
    return Application.find({
      $or: [{ studentId }, { student: studentId }],
    })
      .populate('projectOpportunityId')
      .populate('project')
      .populate('recruiterId', 'fullName email avatar college')
      .sort({ createdAt: -1 });
  }

  async withdrawApplication(studentId, applicationId) {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw ApiError.notFound('Application not found');
    }

    const isStudent =
      application.studentId?.toString() === studentId.toString() ||
      application.student?.toString() === studentId.toString();

    if (!isStudent) {
      throw ApiError.forbidden('You are not authorized to withdraw this application');
    }

    if (application.status === 'Selected') {
      throw ApiError.badRequest('Cannot withdraw an application that has already been selected');
    }

    application.status = 'Withdrawn';
    await application.save();
    return application;
  }

  async getProjectApplications(userId, projectId, userRole) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    const isOwner =
      project.createdBy?.toString() === userId.toString() ||
      project.user?.toString() === userId.toString();

    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('You are not authorized to view applications for this project');
    }

    const applications = await Application.find({
      $or: [{ projectOpportunityId: projectId }, { project: projectId }],
    })
      .populate('studentId', 'fullName email avatar college branch graduationYear')
      .populate('student', 'fullName email avatar college branch graduationYear')
      .sort({ createdAt: -1 });

    const studentIds = applications.map((app) => app.studentId?._id || app.student?._id).filter(Boolean);

    const portfolios = await Portfolio.find({ student: { $in: studentIds } });
    const portfolioMap = new Map();
    portfolios.forEach((p) => {
      portfolioMap.set(p.student.toString(), p);
    });

    const evaluations = await AIEvaluation.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 });
    const evalMap = new Map();
    evaluations.forEach((ev) => {
      if (!evalMap.has(ev.studentId.toString())) {
        evalMap.set(ev.studentId.toString(), ev);
      }
    });

    return applications.map((app) => {
      const sId = (app.studentId?._id || app.student?._id)?.toString();
      const rawApp = app.toObject();
      return {
        ...rawApp,
        portfolio: portfolioMap.get(sId) || null,
        aiEvaluation: evalMap.get(sId) || null,
      };
    });
  }

  async getRecruiterCandidates(recruiterId) {
    const projects = await Project.find({
      $or: [{ createdBy: recruiterId }, { user: recruiterId }],
    }).select('_id title');

    const projectIds = projects.map((p) => p._id);

    const applications = await Application.find({
      $or: [
        { projectOpportunityId: { $in: projectIds } },
        { project: { $in: projectIds } },
        { recruiterId },
      ],
    })
      .populate('studentId', 'fullName email avatar college branch graduationYear')
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('projectOpportunityId', 'title')
      .populate('project', 'title')
      .sort({ createdAt: -1 });

    const studentIds = applications.map((app) => app.studentId?._id || app.student?._id).filter(Boolean);

    const portfolios = await Portfolio.find({ student: { $in: studentIds } });
    const portfolioMap = new Map();
    portfolios.forEach((p) => {
      portfolioMap.set(p.student.toString(), p);
    });

    const evaluations = await AIEvaluation.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 });
    const evalMap = new Map();
    evaluations.forEach((ev) => {
      if (!evalMap.has(ev.studentId.toString())) {
        evalMap.set(ev.studentId.toString(), ev);
      }
    });

    return applications.map((app) => {
      const sId = (app.studentId?._id || app.student?._id)?.toString();
      const rawApp = app.toObject();
      return {
        ...rawApp,
        portfolio: portfolioMap.get(sId) || null,
        aiEvaluation: evalMap.get(sId) || null,
      };
    });
  }

  async updateCandidateStatus(userId, applicationId, { status, recruiterNotes, feedback }, userRole) {
    const application = await Application.findById(applicationId).populate('projectOpportunityId');
    if (!application) {
      throw ApiError.notFound('Application not found');
    }

    const project = application.projectOpportunityId || application.project;
    const isOwner =
      project.createdBy?.toString() === userId.toString() ||
      project.user?.toString() === userId.toString() ||
      application.recruiterId?.toString() === userId.toString();

    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('Not authorized to update candidate application status');
    }

    // Capitalize status if passed in lowercase for backward compatibility
    let formattedStatus = status;
    if (status === 'applied') formattedStatus = 'Applied';
    if (status === 'shortlisted') formattedStatus = 'Shortlisted';
    if (status === 'selected') formattedStatus = 'Selected';
    if (status === 'rejected') formattedStatus = 'Rejected';

    application.status = formattedStatus;
    if (recruiterNotes || feedback) {
      application.recruiterNotes = recruiterNotes || feedback;
      application.feedback = recruiterNotes || feedback;
    }

    await application.save();

    const studentRecipient = application.studentId || application.student;
    if (studentRecipient && formattedStatus !== 'Selected') {
      await notificationService.createNotification({
        recipient: studentRecipient,
        sender: userId,
        type: 'application',
        title: `Application Status: ${formattedStatus}`,
        message: `Your application for "${project.title || 'the project'}" is now "${formattedStatus}".`,
        link: '/applications',
        metadata: { applicationId: application._id },
      });
    }

    if (formattedStatus === 'Selected') {
      return this.selectCandidate(userId, applicationId, { recruiterNotes: recruiterNotes || feedback }, userRole);
    }

    return { application };
  }

  async updateApplicationStatus(userId, applicationId, data, userRole) {
    return this.updateCandidateStatus(userId, applicationId, data, userRole);
  }

  async scheduleInterview(userId, applicationId, { interviewDate, interviewMode, recruiterNotes }, userRole) {
    const application = await Application.findById(applicationId).populate('projectOpportunityId');
    if (!application) {
      throw ApiError.notFound('Application not found');
    }

    const project = application.projectOpportunityId || application.project;
    const isOwner =
      project.createdBy?.toString() === userId.toString() ||
      project.user?.toString() === userId.toString() ||
      application.recruiterId?.toString() === userId.toString();

    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('Not authorized to schedule interviews for this applicant');
    }

    application.status = 'Interview Scheduled';
    application.interviewDate = new Date(interviewDate);
    application.interviewMode = interviewMode;
    if (recruiterNotes) application.recruiterNotes = recruiterNotes;

    await application.save();

    const studentRecipient = application.studentId || application.student;
    if (studentRecipient) {
      await notificationService.createNotification({
        recipient: studentRecipient,
        sender: userId,
        type: 'interview',
        title: 'Interview Scheduled!',
        message: `An interview has been scheduled for "${project.title || 'the project'}" on ${new Date(interviewDate).toLocaleDateString()} (${interviewMode}).`,
        link: '/applications',
        metadata: { applicationId: application._id },
      });
    }

    return application;
  }

  async selectCandidate(userId, applicationId, { recruiterNotes }, userRole) {
    const application = await Application.findById(applicationId).populate('projectOpportunityId');
    if (!application) {
      throw ApiError.notFound('Application not found');
    }

    const projectObj = application.projectOpportunityId || application.project;
    const project = await Project.findById(projectObj._id || projectObj);

    const isOwner =
      project.createdBy?.toString() === userId.toString() ||
      project.user?.toString() === userId.toString() ||
      application.recruiterId?.toString() === userId.toString();

    if (!isOwner && userRole !== 'admin') {
      throw ApiError.forbidden('Not authorized to select candidates for this project');
    }

    const studentId = application.studentId || application.student;

    // 1. Update application status & selectedAt
    application.status = 'Selected';
    application.selectedAt = new Date();
    if (recruiterNotes) application.recruiterNotes = recruiterNotes;
    await application.save();

    // 2. Update project status & selectedStudent
    project.status = 'in_progress';
    project.selectedStudent = studentId;
    await project.save();

    // 3. Create ProjectEngagement record
    let engagement = await ProjectEngagement.findOne({
      project: project._id,
      student: studentId,
    });

    if (!engagement) {
      engagement = await ProjectEngagement.create({
        project: project._id,
        student: studentId,
        recruiter: project.createdBy || project.user,
        application: application._id,
        status: 'active',
        startDate: new Date(),
      });
    }

    // 4. Create Workspace record for live collaboration
    let workspace = await Workspace.findOne({
      project: project._id,
      student: studentId,
    });

    if (!workspace) {
      workspace = await Workspace.create({
        project: project._id,
        student: studentId,
        owner: project.createdBy || project.user,
        application: application._id,
        status: 'active',
        progressPercentage: 0,
      });
    }

    // 5. Notify student
    await notificationService.createNotification({
      recipient: studentId,
      sender: userId,
      type: 'application',
      title: 'Congratulations! Selected for Project',
      message: `You have been selected for "${project.title}". Your live collaboration workspace is active.`,
      link: '/workspaces',
      metadata: { applicationId: application._id, workspaceId: workspace._id },
    });

    return { application, project, engagement, workspace };
  }
}

export default new ApplicationService();
