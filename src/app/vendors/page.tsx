'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '../sidebar-layout';
import Image from 'next/image';

interface Admin {
  id: string;
  email: string;
  admin_name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

interface PickupAddress {
  addressType?: 'primary' | 'secondary' | 'warehouse' | string;
  addressName?: string;
  buildingNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
  isDefault?: boolean;
}

interface Vendor {
  _id: string;
  seller_name: string;
  email: string;
  phone: string;
  shopName: string;
  gstNumber?: string;
  profileImage?: string;
  pickupAddress?: PickupAddress;
  pickupAddresses?: PickupAddress[];
  approved: boolean;
  suspended: boolean;
  suspensionReason?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VendorProduct {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  basePrice: number;
  profitMargin: number;
  discount: number;
  finalPrice: number;
  stock: number;
  category: string;
  brand: string;
  isPublished: boolean;
  isSuspended: boolean;
  isFeatured: boolean;
}

interface VendorDetailData {
  vendor: Vendor;
  productStats: {
    total: number;
    published: number;
    draft: number;
    suspended: number;
  };
  products: VendorProduct[];
  orderStats: {
    orderCount: number;
    itemsSold: number;
    customerRevenue: number;
    vendorBaseRevenue: number;
  };
}

interface VendorStats {
  total: number;
  approved: number;
  pending: number;
  suspended: number;
  emailVerified: number;
  phoneVerified: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type VendorActionPayload = {
  vendorId: string;
  approved?: boolean;
  suspended?: boolean;
  reason?: string;
};

function initials(name?: string) {
  if (!name?.trim()) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
}

function normalizeAddresses(vendor: Vendor): PickupAddress[] {
  if (Array.isArray(vendor.pickupAddresses) && vendor.pickupAddresses.length > 0) {
    return vendor.pickupAddresses;
  }
  const a = vendor.pickupAddress;
  if (a && (a.city || a.streetName || a.buildingNumber || a.postalCode)) {
    return [
      {
        ...a,
        addressName: a.addressName || a.addressType || 'Primary',
        isDefault: true,
      },
    ];
  }
  return [];
}

export default function VendorsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    total: 0,
    approved: 0,
    pending: 0,
    suspended: 0,
    emailVerified: 0,
    phoneVerified: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorDetail, setVendorDetail] = useState<VendorDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'activate' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const canManageProducts = useMemo(() => {
    if (!admin) return false;
    return admin.role === 'super_admin' || admin.permissions?.includes('manage_products');
  }, [admin]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.data.admin);
      } else {
        localStorage.removeItem('adminToken');
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      router.push('/auth/signin');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchVendors = useCallback(async () => {
    try {
      setIsLoadingVendors(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/vendors/list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVendors(data.data.vendors || []);
          setStats(data.data.stats);
          setPagination(data.data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setIsLoadingVendors(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchTerm]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (admin) fetchVendors();
  }, [admin, fetchVendors]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const loadVendorDetail = useCallback(async (vendorId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setVendorDetail(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/vendors/${vendorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        setDetailError(data.message || 'Failed to load vendor details');
        return;
      }
      setVendorDetail(data.data);
      setSelectedVendor(data.data.vendor);
    } catch (error) {
      console.error(error);
      setDetailError('Failed to load vendor details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleViewVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDetailTab('overview');
    setShowVendorModal(true);
    await loadVendorDetail(vendor._id);
  };

  const closeVendorModal = () => {
    setShowVendorModal(false);
    setVendorDetail(null);
    setDetailError(null);
  };

  const handleAction = (vendor: Vendor, type: 'approve' | 'reject' | 'suspend' | 'activate') => {
    setSelectedVendor(vendor);
    setActionType(type);
    setActionReason('');
    setShowActionModal(true);
  };

  const performAction = async () => {
    if (!selectedVendor || !actionType) return;
    if (actionType === 'suspend' && !actionReason.trim()) {
      alert('Suspension reason is required');
      return;
    }
    setIsPerformingAction(true);
    try {
      const token = localStorage.getItem('adminToken');
      let endpoint = '';
      const payload: VendorActionPayload = { vendorId: selectedVendor._id };
      if (actionType === 'approve' || actionType === 'reject') {
        endpoint = '/api/admin/vendors/approve';
        payload.approved = actionType === 'approve';
      } else if (actionType === 'suspend' || actionType === 'activate') {
        endpoint = '/api/admin/vendors/suspend';
        payload.suspended = actionType === 'suspend';
      }
      if (actionReason) payload.reason = actionReason;

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setShowActionModal(false);
        fetchVendors();
        if (showVendorModal) await loadVendorDetail(selectedVendor._id);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const getStatusBadge = (vendor: Vendor) => {
    if (vendor.suspended) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Suspended
        </span>
      );
    }
    if (vendor.approved) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const getActionButtons = (vendor: Vendor) => (
    <>
      <button onClick={() => handleViewVendor(vendor)} className="text-blue-600 hover:text-blue-900 mr-3">
        View
      </button>
      {vendor.suspended ? (
        <button onClick={() => handleAction(vendor, 'activate')} className="text-green-600 hover:text-green-900">
          Activate
        </button>
      ) : vendor.approved ? (
        <button onClick={() => handleAction(vendor, 'suspend')} className="text-yellow-600 hover:text-yellow-900">
          Suspend
        </button>
      ) : (
        <>
          <button onClick={() => handleAction(vendor, 'approve')} className="text-green-600 hover:text-green-900 mr-3">
            Approve
          </button>
          <button onClick={() => handleAction(vendor, 'reject')} className="text-red-600 hover:text-red-900">
            Reject
          </button>
        </>
      )}
    </>
  );

  const displayVendor = vendorDetail?.vendor || selectedVendor;
  const addresses = displayVendor ? normalizeAddresses(displayVendor) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-sm text-gray-500 mt-1">Approve sellers, inspect products, and track performance.</p>
          </div>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.approved, color: 'text-blue-600' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: stats.total, active: 'bg-red-600 text-white' },
              { key: 'approved', label: 'Active', count: stats.approved, active: 'bg-green-600 text-white' },
              { key: 'pending', label: 'Pending', count: stats.pending, active: 'bg-yellow-600 text-white' },
              { key: 'suspended', label: 'Suspended', count: stats.suspended, active: 'bg-red-600 text-white' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => handleStatusFilter(f.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === f.key ? f.active : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">All Vendors</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {isLoadingVendors ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                </div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No vendors found</div>
              ) : (
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {vendor.profileImage ? (
                                <Image
                                  src={vendor.profileImage}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover"
                                  width={40}
                                  height={40}
                                  unoptimized
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {initials(vendor.seller_name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{vendor.seller_name || '—'}</div>
                              <div className="text-sm text-gray-500">{vendor.shopName || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.email}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.phone}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">{getStatusBadge(vendor)}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-1">
                            {vendor.emailVerified && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Email
                              </span>
                            )}
                            {vendor.phoneVerified && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Phone
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {getActionButtons(vendor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor detail drawer / modal */}
      {showVendorModal && displayVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-start gap-4 p-5 border-b border-gray-200">
              <div className="flex items-center gap-4 min-w-0">
                {displayVendor.profileImage ? (
                  <Image
                    src={displayVendor.profileImage}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover shrink-0"
                    width={56}
                    height={56}
                    unoptimized
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <span className="text-base font-medium text-gray-700">
                      {initials(displayVendor.seller_name)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {displayVendor.seller_name || 'Vendor'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{displayVendor.shopName}</p>
                  <div className="mt-1">{getStatusBadge(displayVendor)}</div>
                </div>
              </div>
              <button onClick={closeVendorModal} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Close">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex border-b border-gray-200 px-5 gap-1 overflow-x-auto">
              {(
                [
                  { key: 'overview', label: 'Overview' },
                  { key: 'products', label: `Products${vendorDetail ? ` (${vendorDetail.productStats.total})` : ''}` },
                  { key: 'orders', label: 'Orders & revenue' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                    detailTab === tab.key
                      ? 'border-red-600 text-red-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {detailLoading && (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                </div>
              )}

              {detailError && !detailLoading && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {detailError}
                </div>
              )}

              {!detailLoading && detailTab === 'overview' && (
                <div className="space-y-5">
                  {vendorDetail && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Products</p>
                        <p className="text-xl font-bold text-gray-900">{vendorDetail.productStats.total}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Published</p>
                        <p className="text-xl font-bold text-green-700">{vendorDetail.productStats.published}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Orders</p>
                        <p className="text-xl font-bold text-blue-700">{vendorDetail.orderStats.orderCount}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Customer revenue</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatMoney(vendorDetail.orderStats.customerRevenue)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{displayVendor.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{displayVendor.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">GST</p>
                      <p className="font-medium text-gray-900">{displayVendor.gstNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Verification</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            displayVendor.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          Email {displayVendor.emailVerified ? 'verified' : 'not verified'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            displayVendor.phoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          Phone {displayVendor.phoneVerified ? 'verified' : 'not verified'}
                        </span>
                      </div>
                    </div>
                    {displayVendor.suspended && displayVendor.suspensionReason && (
                      <div className="md:col-span-2">
                        <p className="text-gray-500">Suspension reason</p>
                        <p className="text-red-700 bg-red-50 rounded-md p-2 mt-1">{displayVendor.suspensionReason}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Pickup address</p>
                    {addresses.length === 0 ? (
                      <p className="text-sm text-gray-500">No pickup address on file.</p>
                    ) : (
                      <div className="space-y-2">
                        {addresses.map((address, index) => (
                          <div key={index} className="border border-gray-200 rounded-md p-3 text-sm">
                            <div className="flex justify-between gap-2">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {address.addressName || address.addressType || `Address ${index + 1}`}
                                </p>
                                <p className="text-gray-600">
                                  {[address.buildingNumber, address.streetName].filter(Boolean).join(', ')}
                                </p>
                                <p className="text-gray-600">
                                  {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                                </p>
                                {address.country && <p className="text-gray-600">{address.country}</p>}
                                {address.landmark && (
                                  <p className="text-gray-500">Landmark: {address.landmark}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                {address.addressType && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {address.addressType}
                                  </span>
                                )}
                                {address.isDefault && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">
                        {displayVendor.createdAt ? new Date(displayVendor.createdAt).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last updated</p>
                      <p className="font-medium">
                        {displayVendor.updatedAt ? new Date(displayVendor.updatedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {canManageProducts && (
                      <Link
                        href={`/products?vendorId=${displayVendor._id}`}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                        onClick={closeVendorModal}
                      >
                        Manage all products
                      </Link>
                    )}
                    <Link
                      href={`/orders?vendorId=${displayVendor._id}`}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                      onClick={closeVendorModal}
                    >
                      View orders
                    </Link>
                    {!displayVendor.suspended && displayVendor.approved && (
                      <button
                        onClick={() => handleAction(displayVendor, 'suspend')}
                        className="px-4 py-2 rounded-lg border border-yellow-200 text-yellow-800 text-sm hover:bg-yellow-50"
                      >
                        Suspend
                      </button>
                    )}
                    {displayVendor.suspended && (
                      <button
                        onClick={() => handleAction(displayVendor, 'activate')}
                        className="px-4 py-2 rounded-lg border border-green-200 text-green-800 text-sm hover:bg-green-50"
                      >
                        Activate
                      </button>
                    )}
                    {!displayVendor.approved && !displayVendor.suspended && (
                      <>
                        <button
                          onClick={() => handleAction(displayVendor, 'approve')}
                          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(displayVendor, 'reject')}
                          className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!detailLoading && detailTab === 'products' && vendorDetail && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100">Total {vendorDetail.productStats.total}</span>
                    <span className="px-2 py-1 rounded-full bg-green-50 text-green-800">
                      Published {vendorDetail.productStats.published}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-yellow-50 text-yellow-800">
                      Draft {vendorDetail.productStats.draft}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-red-50 text-red-800">
                      Suspended {vendorDetail.productStats.suspended}
                    </span>
                  </div>

                  {vendorDetail.products.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No products from this vendor yet.</p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {vendorDetail.products.map((p) => (
                            <tr key={p._id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-9 w-9 rounded bg-gray-100 overflow-hidden relative shrink-0">
                                    {p.images?.[0] ? (
                                      <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate max-w-[220px]">{p.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {p.brand} · {p.category}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">₹{Number(p.basePrice).toFixed(2)}</td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span>{p.profitMargin}%</span>
                                <span className="block text-[10px] text-gray-400">
                                  ₹{(p.basePrice * (1 + (p.profitMargin || 0) / 100)).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap font-medium text-blue-700">
                                ₹{Number(p.finalPrice).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {p.isSuspended ? (
                                  <span className="text-xs font-semibold text-red-700">Suspended</span>
                                ) : p.isPublished ? (
                                  <span className="text-xs font-semibold text-green-700">Published</span>
                                ) : (
                                  <span className="text-xs font-semibold text-yellow-700">Draft</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {canManageProducts && (
                    <Link
                      href={`/products?vendorId=${displayVendor._id}`}
                      className="inline-flex px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                      onClick={closeVendorModal}
                    >
                      Open in Products · set pricing
                    </Link>
                  )}
                </div>
              )}

              {!detailLoading && detailTab === 'orders' && vendorDetail && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="text-2xl font-bold">{vendorDetail.orderStats.orderCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs text-gray-500">Items sold</p>
                      <p className="text-2xl font-bold">{vendorDetail.orderStats.itemsSold}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-xs text-gray-500">Vendor base total</p>
                      <p className="text-xl font-bold">{formatMoney(vendorDetail.orderStats.vendorBaseRevenue)}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Customer paid {formatMoney(vendorDetail.orderStats.customerRevenue)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/orders?vendorId=${displayVendor._id}`}
                    className="inline-flex px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                    onClick={closeVendorModal}
                  >
                    Open filtered order list
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showActionModal && selectedVendor && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">{actionType} vendor</h3>
              <button onClick={() => setShowActionModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to {actionType} <strong>{selectedVendor.seller_name}</strong>?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason {actionType === 'suspend' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder={
                  actionType === 'suspend'
                    ? 'Enter suspension reason (required)...'
                    : 'Enter reason for this action...'
                }
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={performAction}
                disabled={isPerformingAction || (actionType === 'suspend' && !actionReason.trim())}
                className={`flex-1 px-4 py-2 rounded-md text-sm text-white disabled:opacity-50 ${
                  actionType === 'approve' || actionType === 'activate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isPerformingAction ? 'Processing...' : actionType.charAt(0).toUpperCase() + actionType.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
