"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaShoppingBag,
  FaChartBar,
  FaCreditCard,
  FaCog,
  FaBars,
  FaUser,
  FaShieldAlt,
  FaSignOutAlt,
  FaBoxOpen,
  FaBriefcase,
  FaChevronDown,
  FaFileAlt,
  FaClipboardList,
  FaGraduationCap,
} from "react-icons/fa";

type NavLink = {
  kind: "link";
  href: string;
  icon: ReactNode;
  label: string;
  isActive: (pathname: string) => boolean;
};

type NavGroup = {
  kind: "group";
  id: string;
  icon: ReactNode;
  label: string;
  isActive: (pathname: string) => boolean;
  children: Array<{
    href: string;
    icon: ReactNode;
    label: string;
    isActive: (pathname: string) => boolean;
  }>;
};

type NavItem = NavLink | NavGroup;

const navItems: NavItem[] = [
  {
    kind: "link",
    href: "/",
    icon: <FaHome size={18} />,
    label: "Dashboard",
    isActive: (pathname) => pathname === "/",
  },
  {
    kind: "link",
    href: "/admins",
    icon: <FaShieldAlt size={18} />,
    label: "Admins",
    isActive: (pathname) => pathname.startsWith("/admins"),
  },
  {
    kind: "link",
    href: "/users",
    icon: <FaUsers size={18} />,
    label: "Users",
    isActive: (pathname) => pathname.startsWith("/users"),
  },
  {
    kind: "link",
    href: "/vendors",
    icon: <FaBuilding size={18} />,
    label: "Vendors",
    isActive: (pathname) => pathname.startsWith("/vendors"),
  },
  {
    kind: "link",
    href: "/products",
    icon: <FaBoxOpen size={18} />,
    label: "Products",
    isActive: (pathname) => pathname.startsWith("/products"),
  },
  {
    kind: "group",
    id: "career",
    icon: <FaBriefcase size={18} />,
    label: "Career",
    isActive: (pathname) => pathname.startsWith("/career"),
    children: [
      {
        href: "/career/jobs",
        icon: <FaFileAlt size={14} />,
        label: "Job postings",
        isActive: (pathname) => pathname.startsWith("/career/jobs"),
      },
      {
        href: "/career/applications",
        icon: <FaClipboardList size={14} />,
        label: "Internship Applications",
        isActive: (pathname) =>
          pathname.startsWith("/career/applications") &&
          !pathname.startsWith("/career/cap-applications"),
      },
      {
        href: "/career/cap-applications",
        icon: <FaGraduationCap size={14} />,
        label: "CAP Applications",
        isActive: (pathname) => pathname.startsWith("/career/cap-applications"),
      },
    ],
  },
  {
    kind: "link",
    href: "/orders",
    icon: <FaShoppingBag size={18} />,
    label: "Orders",
    isActive: (pathname) => pathname.startsWith("/orders"),
  },
  {
    kind: "link",
    href: "/analytics",
    icon: <FaChartBar size={18} />,
    label: "Analytics",
    isActive: (pathname) => pathname.startsWith("/analytics"),
  },
  {
    kind: "link",
    href: "/payments",
    icon: <FaCreditCard size={18} />,
    label: "Payments",
    isActive: (pathname) => pathname.startsWith("/payments"),
  },
  {
    kind: "link",
    href: "/profile",
    icon: <FaUser size={18} />,
    label: "Profile",
    isActive: (pathname) => pathname.startsWith("/profile"),
  },
  {
    kind: "link",
    href: "/settings",
    icon: <FaCog size={18} />,
    label: "Settings",
    isActive: (pathname) => pathname.startsWith("/settings"),
  },
];

function resolvePageTitle(pathname: string): string {
  for (const item of navItems) {
    if (item.kind === "link" && item.isActive(pathname)) return item.label;
    if (item.kind === "group") {
      const child = item.children.find((c) => c.isActive(pathname));
      if (child) return `${item.label} · ${child.label}`;
      if (item.isActive(pathname)) return item.label;
    }
  }
  return "Dashboard";
}

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (item.kind === "group" && item.isActive(pathname)) {
          next[item.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem("adminToken");
      if (token) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setAdmin(data.data.admin);
          } else {
            localStorage.removeItem("adminToken");
            router.push("/auth/signin");
          }
        } catch (error) {
          console.error("Failed to fetch admin data:", error);
          localStorage.removeItem("adminToken");
          router.push("/auth/signin");
        }
      } else {
        router.push("/auth/signin");
      }
    };

    fetchAdminData().finally(() => {
      setIsLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    router.push("/auth/signin");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu")) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`h-full bg-[#1f2937] text-white w-64 flex flex-col py-6 px-4 space-y-2 fixed inset-y-0 left-0 z-30 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative md:w-64 md:block`}
      >
        <div className="flex items-center gap-2 mb-8 px-2">
          <span className="bg-red-500 rounded-md w-6 h-6 flex items-center justify-center">
            <span className="text-white font-bold">AB</span>
          </span>
          <span className="text-xl font-bold tracking-wide">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.kind === "link") {
              return (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={item.isActive(pathname)}
                  onClick={() => setSidebarOpen(false)}
                />
              );
            }

            const expanded = openGroups[item.id] ?? item.isActive(pathname);
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${
                    item.isActive(pathname)
                      ? "bg-[#374151]/70 text-white"
                      : "hover:bg-[#374151] text-gray-200"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1 text-base">{item.label}</span>
                  <FaChevronDown
                    size={12}
                    className={`opacity-70 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded && (
                  <div className="ml-3 border-l border-gray-600 pl-2 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          child.isActive(pathname)
                            ? "bg-[#374151] text-white"
                            : "text-gray-300 hover:bg-[#374151] hover:text-white"
                        }`}
                      >
                        <span>{child.icon}</span>
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

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

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full w-full">
        <header className="flex items-center justify-between bg-white shadow px-4 py-3 sticky top-0 z-10">
          <button
            className="md:hidden text-gray-700 mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Open sidebar"
          >
            <FaBars size={22} />
          </button>
          <div className="text-lg sm:text-2xl font-semibold text-gray-800 truncate">
            {resolvePageTitle(pathname)}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <input
              type="text"
              placeholder="Search..."
              className="hidden sm:block rounded-lg border border-gray-200 px-3 py-2 w-40 sm:w-64 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-100 text-gray-800"
            />

            {admin && (
              <div className="relative user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    {admin.profileImage ? (
                      <Image
                        src={admin.profileImage}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover"
                        width={32}
                        height={32}
                        priority
                        unoptimized={admin.profileImage.startsWith("http")}
                      />
                    ) : (
                      <span className="text-sm font-bold text-red-600">
                        {admin.admin_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {admin.admin_name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {admin.role.replace("_", " ")}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

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
                    <div className="border-t border-gray-100" />
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
        active ? "bg-[#374151] text-white" : "hover:bg-[#374151] text-gray-200"
      }`}
      onClick={onClick}
    >
      <span className="text-lg group-hover:text-white">{icon}</span>
      <span className="flex-1 text-base">{label}</span>
    </Link>
  );
}
