'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiTrendingUp,
  FiPieChart,
  FiList,
  FiCalendar,
  FiEdit,
} from 'react-icons/fi';
import Logo from './Logo';

const links = [
  { href: '/', label: 'Dashboard', icon: <FiHome /> },
  { href: '/budgets', label: '+ Monthly Budget', icon: <FiCalendar /> },
  { href: '/transactions', label: 'Expenditures', icon: <FiList /> },
  { href: '/analysis', label: 'Analysis', icon: <FiPieChart /> },
  { href: '/monthly-analysis', label: 'Monthly Overview', icon: <FiTrendingUp /> },
  { href: '/special_functions', label: 'Special Functions', icon: <FiEdit /> },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-40 z-10 md:hidden"
        ></div>
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-60 bg-black/40 backdrop-blur-md shadow-lg flex flex-col overflow-hidden transform transition-transform duration-300 z-20
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="text-2xl font-semibold p-3 border-none bg-black/20 backdrop-blur">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors  ${
                  pathname === link.href
                    ? 'bg-blue/20 backdrop-blur font-medium text-blue-400'
                    : 'hover:bg-blue/30 hover:backdrop-blur text-blue-200 hover:text-blue-300'
                }`}
                onClick={onClose}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-sm text-gray-200">v1.0</div>
      </aside>
    </>
  );
}
