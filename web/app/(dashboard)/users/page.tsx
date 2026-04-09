import { getUsers } from '@/lib/api';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const users = await getUsers();
  return <UsersClient users={users} />;
}
