import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Auth pages
import Login         from '@/pages/Login';
import Register      from '@/pages/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Role dashboards
import StudentDashboard   from '@/pages/student/StudentDashboard';
import FacultyDashboard   from '@/pages/faculty/FacultyDashboard';
import RecruiterDashboard from '@/pages/recruiter/RecruiterDashboard';
import AlumniDashboard    from '@/pages/alumni/AlumniDashboard';
import AdminDashboard     from '@/pages/admin/AdminDashboard';

// Alumni Ecosystem pages
import AlumniProfile        from '@/pages/alumni/AlumniProfile';
import StudentDiscovery    from '@/pages/alumni/StudentDiscovery';
import StudentPortfolioView from '@/pages/alumni/StudentPortfolioView';
import MentorshipRequests   from '@/pages/alumni/MentorshipRequests';
import EndorsementList      from '@/pages/alumni/EndorsementList';
import MockInterviewRequests from '@/pages/alumni/MockInterviewRequests';
import Referrals            from '@/pages/alumni/Referrals';

// Shared pages
import Profile        from '@/pages/Profile';
import Projects        from '@/pages/projects/Projects';
import CreateProject  from '@/pages/projects/CreateProject';
import EditProject    from '@/pages/projects/EditProject';
import ProjectDetails from '@/pages/projects/ProjectDetails';
import ApplicantManagement from '@/pages/recruiter/ApplicantManagement';
import WorkspaceList   from '@/pages/workspace/WorkspaceList';
import WorkspaceDetail from '@/pages/workspace/WorkspaceDetail';
import VerifiedPortfolio from '@/pages/portfolio/VerifiedPortfolio';
import Resume from '@/pages/student/Resume';
import Certificates from '@/pages/student/Certificates';
import GithubIntegration from '@/pages/student/GithubIntegration';
import NotFound       from '@/pages/NotFound';

// Route guards
import ProtectedRoute from '@/components/common/ProtectedRoute';

// Constants
import { ROLES, ROUTES } from '@/constants';

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/"               element={<Navigate to="/login" replace />} />
    <Route path="/login"          element={<Login />} />
    <Route path="/register"       element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/portfolio/verify/:certificateId" element={<VerifiedPortfolio />} />

    {/* Role dashboards — each protected by role */}
    <Route
      path="/dashboard/student"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/faculty"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACULTY, ROLES.ADMIN]}>
          <FacultyDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/recruiter"
      element={
        <ProtectedRoute allowedRoles={[ROLES.RECRUITER, ROLES.ADMIN]}>
          <RecruiterDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/alumni"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <AlumniDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni"
      element={<Navigate to="/dashboard/alumni" replace />}
    />
    <Route
      path="/dashboard/admin"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />

    {/* Alumni Ecosystem Routes */}
    <Route
      path="/alumni/profile"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <AlumniProfile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/students"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN, ROLES.RECRUITER]}>
          <StudentDiscovery />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/students/:studentId"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN, ROLES.RECRUITER, ROLES.FACULTY]}>
          <StudentPortfolioView />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/mentorship"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <MentorshipRequests />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/endorsements"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <EndorsementList />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/mock-interviews"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <MockInterviewRequests />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alumni/referrals"
      element={
        <ProtectedRoute allowedRoles={[ROLES.ALUMNI, ROLES.ADMIN]}>
          <Referrals />
        </ProtectedRoute>
      }
    />

    {/* Legacy /dashboard — redirect based on role */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <RoleRedirect />
        </ProtectedRoute>
      }
    />

    {/* Shared protected routes */}
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/projects"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <Projects />
        </ProtectedRoute>
      }
    />
    <Route
      path="/projects/new"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <CreateProject />
        </ProtectedRoute>
      }
    />
    <Route
      path="/projects/:projectId/edit"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <EditProject />
        </ProtectedRoute>
      }
    />
    <Route
      path="/projects/:projectId"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <ProjectDetails />
        </ProtectedRoute>
      }
    />
    <Route
      path="/projects/:projectId/applicants"
      element={
        <ProtectedRoute allowedRoles={[ROLES.FACULTY, ROLES.RECRUITER, ROLES.ADMIN]}>
          <ApplicantManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/workspaces"
      element={
        <ProtectedRoute>
          <WorkspaceList />
        </ProtectedRoute>
      }
    />
    <Route
      path="/workspace/:workspaceId"
      element={
        <ProtectedRoute>
          <WorkspaceDetail />
        </ProtectedRoute>
      }
    />
    <Route
      path="/portfolio/me"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]}>
          <VerifiedPortfolio />
        </ProtectedRoute>
      }
    />
    <Route
      path="/resume"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]}>
          <Resume />
        </ProtectedRoute>
      }
    />
    <Route
      path="/certificates"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ADMIN]}>
          <Certificates />
        </ProtectedRoute>
      }
    />
    <Route
      path="/github"
      element={
        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
          <GithubIntegration />
        </ProtectedRoute>
      }
    />

    {/* 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

// Redirects /dashboard to the correct role dashboard
const ROLE_ROUTE_MAP = {
  student:   '/dashboard/student',
  faculty:   '/dashboard/faculty',
  recruiter: '/dashboard/recruiter',
  alumni:    '/dashboard/alumni',
  admin:     '/dashboard/admin',
};

const RoleRedirect = () => {
  const { user } = useAuth();
  const dest = user?.role ? ROLE_ROUTE_MAP[user.role] : '/dashboard/student';
  return <Navigate to={dest} replace />;
};

export default AppRoutes;
