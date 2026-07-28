import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import LoginFormPlaceholder from '../../components/forms/LoginFormPlaceholder';

const Login = () => {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to access your VidyaLink dashboard"
    >
      <LoginFormPlaceholder />

      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
          Register here
        </Link>
      </div>
    </AuthLayout>
  );
};

export default Login;
