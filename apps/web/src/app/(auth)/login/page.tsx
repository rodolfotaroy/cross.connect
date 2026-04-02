import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow rounded-lg">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CrossConnect</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
