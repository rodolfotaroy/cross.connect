'use client';

import { spTeamApi } from '@/lib/api/sp-team';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewSpUserForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session?.user as any)?.accessToken as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function execute(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      await spTeamApi.create(token, {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as any,
      });
      router.push('/sp/organization');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void execute(new FormData(e.currentTarget));
      }}
      className="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
    >
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First Name" name="firstName" required />
        <Field label="Last Name" name="lastName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="role">
            Role *
          </label>
          <select
            id="role"
            name="role"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="sp_admin">SP Admin</option>
            <option value="sp_ops">Operations</option>
            <option value="sp_viewer">Viewer</option>
            <option value="sp_report">Reports</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create User'}
        </button>
        <a
          href="/sp/organization"
          className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700" htmlFor={name}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
      />
    </div>
  );
}
