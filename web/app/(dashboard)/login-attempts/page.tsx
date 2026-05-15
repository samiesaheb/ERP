import { getLoginAttempts } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import LoginAttemptsClient from './LoginAttemptsClient';
import type { LoginAttempt } from '@/lib/types';

export default async function LoginAttemptsPage() {
  let attempts: LoginAttempt[];
  try {
    attempts = await getLoginAttempts({ limit: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div>
        <Topbar title="Login Attempts" />
        <div className="px-6 py-5">
          <div className="rounded-xl bg-red-50 border-[0.5px] border-red-200 px-4 py-3 text-sm text-red-700">
            {msg}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Login Attempts" />
      <div className="px-6 py-5">
        <LoginAttemptsClient attempts={attempts} />
      </div>
    </div>
  );
}
