import React from 'react';
import { Navigate } from 'react-router-dom';

// Keeping the list route gives bookmarks a stable destination while the builder shows all versions.
const GeneratedResumes = () => <Navigate to="/student/resume-builder" replace />;
export default GeneratedResumes;
