'use client';

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { FiMenu, FiChevronDown, FiLogOut } from 'react-icons/fi';

export default function Topbar({
  onToggleSidebar,
}: {
  onToggleSidebar?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Utility to truncate long emails
  const truncateEmail = (email: string | null | undefined, maxLength = 20) => {
    if (!email) return '';
    return email.length > maxLength
      ? email.substring(0, maxLength - 3) + '...'
      : email;
  };

  return (
    <header className="h-14 bg-black/40 backdrop-blur-md border-b flex items-center justify-between px-4 sticky top-0 z-20">
      {/* Left: Sidebar toggle */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded hover:bg-gray-100"
        >
          <FiMenu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium text-blue-200">Budget Tracker</h1>
      </div>

      {/* Right: User dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center space-x-2 p-2 rounded hover:bg-white/30 hover:backdrop-blur"
        >
          <span className="text-sm text-blue-200">
            {truncateEmail(user?.email)}
          </span>
          <FiChevronDown
            className={`h-4 w-4 transform transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white/80 backdrop-blur-md rounded-md shadow-md border z-10">
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              <FiLogOut className="text-gray-500" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
