import { getUsers } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div>
      <Topbar title="Users" />
      <div className="px-6 py-5">
        <UsersClient users={users} />
      </div>
    </div>
  );
}
