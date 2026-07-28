import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import RegisterFormPlaceholder from '../../components/forms/RegisterFormPlaceholder';

const Register = () => {
  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Join the VidyaLink academic community"
    >
      <RegisterFormPlaceholder />

      <div className="mt-6 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
