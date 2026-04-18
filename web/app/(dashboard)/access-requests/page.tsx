import { getAccessRequests, getUsers } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import AccessRequestsClient from './AccessRequestsClient';

export default async function AccessRequestsPage() {
  const [requests, users] = await Promise.all([getAccessRequests(), getUsers()]);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.full_name]));

  return (
    <div>
      <Topbar title="Access Requests" />
      <div className="px-6 py-5">
        <AccessRequestsClient requests={requests} userMap={userMap} />
      </div>
    </div>
  );
}
