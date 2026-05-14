import Sidebar from '@/components/layout/Sidebar';
import { AppPrefsProvider } from '@/contexts/AppPrefsContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppPrefsProvider>
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </AppPrefsProvider>
  );
}
