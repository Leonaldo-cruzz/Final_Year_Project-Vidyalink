import Application from '../models/application.model.js';
import Project from '../models/project.model.js';
import ProjectEngagement from '../models/projectEngagement.model.js';
import Workspace from '../models/workspace.model.js';
import ApiError from '../utils/ApiError.js';
import notificationEventsService from './notificationEvents.service.js';

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

    return Application.create({
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

    return Application.find({
      $or: [{ projectOpportunityId: projectId }, { project: projectId }],
    })
      .populate('studentId', 'fullName email avatar college branch graduationYear')
      .populate('student', 'fullName email avatar college branch graduationYear')
      .sort({ createdAt: -1 });
  }

  async updateApplicationStatus(userId, applicationId, { status, recruiterNotes, feedback }, userRole) {
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

    const studentTargetId = application.studentId || application.student;
    const projectTitle = project?.title || 'Project Opportunity';

    if (formattedStatus === 'Shortlisted') {
      notificationEventsService.notifyCandidateShortlisted({
        studentId: studentTargetId,
        recruiterId: userId,
        projectTitle,
        entityId: application._id,
      });
    }

    if (formattedStatus === 'Selected') {
      return this.selectCandidate(userId, applicationId, { recruiterNotes: recruiterNotes || feedback }, userRole);
    }

    return { application };
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

    const studentTargetId = application.studentId || application.student;
    const projectTitle = project?.title || 'Interview Opportunity';

    notificationEventsService.notifyInterviewScheduled({
      studentId: studentTargetId,
      recruiterId: userId,
      projectTitle,
      interviewDate: application.interviewDate,
      interviewMode,
      entityId: application._id,
    });

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

    notificationEventsService.notifyInterviewCompleted({
      studentId,
      actorId: userId,
      title: project?.title || 'Project Application',
      status: 'Selected',
      entityId: application._id,
    });

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

    return { application, project, engagement, workspace };
  }
}

export default new ApplicationService();
