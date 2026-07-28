import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../ui/Input';
import Button from '../ui/Button';

const registerSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'faculty', 'alumni', 'recruiter']),
});

const RegisterFormPlaceholder = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const onSubmit = (data) => {
    // Placeholder handler - APIs not connected yet
    console.log('RegisterForm submit placeholder:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        type="text"
        placeholder="e.g. Alex Johnson"
        error={errors.fullName?.message}
        {...register('fullName')}
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="alex@university.edu"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Select Role
        </label>
        <select
          {...register('role')}
          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
          <option value="alumni">Alumni</option>
          <option value="recruiter">Recruiter</option>
        </select>
        {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>}
      </div>

      <Button type="submit">Create Account</Button>
    </form>
  );
};

export default RegisterFormPlaceholder;
