import React from 'react';
import ResumeTemplate from './ResumeTemplate';

const ResumePreview = ({ resume }) => <ResumeTemplate content={resume?.content} />;
export default ResumePreview;
