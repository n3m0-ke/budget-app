'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/budgets', label: '+ Monthly Budget' },
  { href: '/transactions', label: 'Expenditures' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/monthly-analysis', label: 'Monthly Overview' },
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
        className={`fixed top-0 left-0 h-screen w-60 bg-white shadow-md flex flex-col overflow-hidden transform transition-transform duration-300 z-20
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="text-2xl font-semibold p-4 border-b">MyBudget</div>
        <nav className="flex-1 overflow-y-auto">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className={`px-4 py-3 cursor-pointer ${
                  pathname === link.href
                    ? 'bg-blue-100 font-medium text-blue-600'
                    : 'hover:bg-gray-100'
                }`}
                onClick={onClose}
              >
                {link.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-sm text-gray-500">v1.0</div>
      </aside>
    </>
  );
}
