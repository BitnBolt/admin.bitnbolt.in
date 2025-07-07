"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FaHome, FaUsers, FaBuilding, FaShoppingBag, FaChartBar, FaCreditCard, FaCog, FaBars, FaUser, FaShieldAlt, FaSignOutAlt } from "react-icons/fa";

const sidebarLinks = [
  {
    href: "/",
    icon: <FaHome size={18} />,
    label: "Dashboard",
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/admins",
    icon: <FaShieldAlt size={18} />,
    label: "Admins",
    isActive: (pathname: string) => pathname.startsWith("/admins"),
  },
  {
    href: "/users",
    icon: <FaUsers size={18} />,
    label: "Users",
    isActive: (pathname: string) => pathname.startsWith("/users"),
  },
  {
    href: "/vendors",
    icon: <FaBuilding size={18} />,
    label: "Vendors",
    isActive: (pathname: string) => pathname.startsWith("/vendors"),
  },
  {
    href: "/orders",
    icon: <FaShoppingBag size={18} />,
    label: "Orders",
    isActive: (pathname: string) => pathname.startsWith("/orders"),
  },
  {
    href: "/analytics",
    icon: <FaChartBar size={18} />,
    label: "Analytics",
    isActive: (pathname: string) => pathname.startsWith("/analytics"),
  },
  {
    href: "/payments",
    icon: <FaCreditCard size={18} />,
    label: "Payments",
    isActive: (pathname: string) => pathname.startsWith("/payments"),
  },
  {
    href: "/profile",
    icon: <FaUser size={18} />,
    label: "Profile",
    isActive: (pathname: string) => pathname.startsWith("/profile"),
  },
  {
    href: "/settings",
    icon: <FaCog size={18} />,
    label: "Settings",
    isActive: (pathname: string) => pathname.startsWith("/settings"),
  },
];

interface Admin {
  id: string;
  email: string;
  admin_name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  profileImage?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setAdmin(data.data.admin);
          } else {
            localStorage.removeItem('adminToken');
            router.push('/auth/signin');
          }
        } catch (error) {
          console.error('Failed to fetch admin data:', error);
          localStorage.removeItem('adminToken');
          router.push('/auth/signin');
        }
      } else {
        router.push('/auth/signin');
      }
    };

    fetchAdminData().finally(() => {
      setIsLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/auth/signin');
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`h-full bg-[#1f2937] text-white w-64 flex flex-col py-6 px-4 space-y-2 fixed inset-y-0 left-0 z-30 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative md:w-64 md:block`}
      >
        <div className="flex items-center gap-2 mb-8 px-2">
          <span className="bg-red-500 rounded-md w-6 h-6 flex items-center justify-center"><span className="text-white font-bold">AB</span></span>
          <span className="text-xl font-bold tracking-wide">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {sidebarLinks.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={link.isActive(pathname)}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
        
        {/* Logout Button */}
        <div className="mt-auto pt-4 border-t border-gray-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-gray-200 hover:bg-[#374151] hover:text-white"
          >
            <FaSignOutAlt size={18} />
            <span className="text-base">Logout</span>
          </button>
        </div>
      </aside>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Main content */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Topbar */}
        <header className="flex items-center justify-between bg-white shadow px-4 py-3 sticky top-0 z-10">
          <button
            className="md:hidden text-gray-700 mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open sidebar"
          >
            <FaBars size={22} />
          </button>
          <div className="text-lg sm:text-2xl font-semibold text-gray-800 truncate">
            {sidebarLinks.find((l) => l.isActive(pathname))?.label || "Dashboard"}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Search Button */}
            <button className="sm:hidden p-2 text-gray-600 hover:text-gray-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <input
              type="text"
              placeholder="Search..."
              className="hidden sm:block rounded-lg border border-gray-200 px-3 py-2 w-40 sm:w-64 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-100 text-gray-800"
            />
            
            {/* User Menu */}
            {admin && (
              <div className="relative user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    {admin.profileImage ? (
                      <Image src={admin.profileImage} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-red-600">
                        {admin.admin_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 truncate">{admin.admin_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{admin.role.replace('_', ' ')}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <div className="flex items-center gap-2">
                        <FaUser size={14} />
                        Profile
                      </div>
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <div className="flex items-center gap-2">
                        <FaCog size={14} />
                        Settings
                      </div>
                    </Link>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <FaSignOutAlt size={14} />
                        Logout
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-6 bg-gray-50 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${active ? "bg-[#374151] text-white" : "hover:bg-[#374151] text-gray-200"}`}
      onClick={onClick}
    >
      <span className="text-lg group-hover:text-white">{icon}</span>
      <span className="flex-1 text-base">{label}</span>
    </Link>
  );
} 