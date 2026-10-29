'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthPage && !loading && !user) router.replace('/login');
  }, [isAuthPage, loading, user, router]);

  if (isAuthPage) {
    return (
      <main className="flex items-center justify-center min-h-screen w-full bg-transparent">
        {children}
      </main>
    );
  }

  // Do not render protected application content until Firebase has resolved
  // the initial persisted session and confirmed that a user is signed in.
  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-gray-500">Checking your session...</main>;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col md:ml-60">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 bg-gray-50 p-4 overflow-y-auto bg-transparent">{children}</main>
      </div>
    </div>
  );
}

export default function LayoutControllerClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
