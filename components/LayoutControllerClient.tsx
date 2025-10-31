'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function LayoutControllerClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      {isAuthPage ? (
        <main className="flex items-center justify-center min-h-screen w-full">
          {children}
        </main>
      ) : (
        <div className="flex min-h-screen w-full">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col md:ml-60">
            <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main className="flex-1 bg-gray-50 p-4 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
