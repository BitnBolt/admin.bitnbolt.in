'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface Vendor {
  _id: string;
  seller_name: string;
  email: string;
  phone: string;
  shopName: string;
  gstNumber?: string;
  profileImage?: string;
  pickupAddresses: Array<{
    addressType: 'primary' | 'secondary' | 'warehouse';
    addressName: string;
    buildingNumber: string;
    streetName: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
    isDefault: boolean;
  }>;
  approved: boolean;
  suspended: boolean;
  suspensionReason?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
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

export default function VendorsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats>({ total: 0, approved: 0, pending: 0, suspended: 0, emailVerified: 0, phoneVerified: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'activate' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/auth/signin');
      return;
    }

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
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/vendors/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVendors(data.data.vendors);
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
    if (admin) {
      fetchVendors();
    }
  }, [admin, fetchVendors]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewVendor = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorModal(true);
  };

  const handleAction = (vendor: Vendor, type: 'approve' | 'reject' | 'suspend' | 'activate') => {
    setSelectedVendor(vendor);
    setActionType(type);
    setActionReason('');
    setShowActionModal(true);
  };

  const performAction = async () => {
    if (!selectedVendor || !actionType) return;
    // Validate reason for suspension
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
      if (actionReason) {
        payload.reason = actionReason;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setShowActionModal(false);
        fetchVendors(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
    } finally {
      setIsPerformingAction(false);
    }
  };

  const getStatusBadge = (vendor: Vendor) => {
    if (vendor.suspended) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>;
    } else if (vendor.approved) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
    } else {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const getActionButtons = (vendor: Vendor) => {
    if (vendor.suspended) {
      return (
        <>
          <button 
            onClick={() => handleViewVendor(vendor)}
            className="text-blue-600 hover:text-blue-900 mr-3"
          >
            View
          </button>
          <button 
            onClick={() => handleAction(vendor, 'activate')}
            className="text-green-600 hover:text-green-900"
          >
            Activate
          </button>
        </>
      );
    } else if (vendor.approved) {
      return (
        <>
          <button 
            onClick={() => handleViewVendor(vendor)}
            className="text-blue-600 hover:text-blue-900 mr-3"
          >
            View
          </button>
          <button 
            onClick={() => handleAction(vendor, 'suspend')}
            className="text-yellow-600 hover:text-yellow-900"
          >
            Suspend
          </button>
        </>
      );
    } else {
      return (
        <>
          <button 
            onClick={() => handleViewVendor(vendor)}
            className="text-blue-600 hover:text-blue-900 mr-3"
          >
            View
          </button>
          <button 
            onClick={() => handleAction(vendor, 'approve')}
            className="text-green-600 hover:text-green-900 mr-3"
          >
            Approve
          </button>
          <button 
            onClick={() => handleAction(vendor, 'reject')}
            className="text-red-600 hover:text-red-900"
          >
            Reject
          </button>
        </>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendor Management</h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Total Vendors</h3>
            <p className="text-3xl font-bold text-green-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Vendors</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approval</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Suspended</h3>
            <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => handleStatusFilter('approved')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({stats.approved})
            </button>
            <button
              onClick={() => handleStatusFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => handleStatusFilter('suspended')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'suspended'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suspended ({stats.suspended})
            </button>
          </div>
        </div>

        {/* Vendor List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Vendors</h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              {isLoadingVendors ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : vendors.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No vendors found</p>
                </div>
              ) : (
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendors.map((vendor) => (
                      <tr key={vendor._id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {vendor.profileImage ? (
                                <Image 
                                  src={vendor.profileImage} 
                                  alt="Profile" 
                                  className="h-10 w-10 rounded-full object-cover" 
                                  width={40}
                                  height={40}
                                  unoptimized={vendor.profileImage.startsWith('http')}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {vendor.seller_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{vendor.seller_name}</div>
                              <div className="text-sm text-gray-500">{vendor.shopName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.email}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.phone}</td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getStatusBadge(vendor)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-1">
                            {vendor.emailVerified && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Email</span>
                            )}
                            {vendor.phoneVerified && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Phone</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(vendor.createdAt).toLocaleDateString()}
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

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Details Modal */}
      {showVendorModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vendor Details</h3>
              <button
                onClick={() => setShowVendorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {selectedVendor.profileImage ? (
                  <Image 
                    src={selectedVendor.profileImage} 
                    alt="Profile" 
                    className="h-16 w-16 rounded-full object-cover" 
                    width={64}
                    height={64}
                    unoptimized={selectedVendor.profileImage.startsWith('http')}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-700">
                      {selectedVendor.seller_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedVendor.seller_name}</h4>
                  <p className="text-gray-600">{selectedVendor.shopName}</p>
                  {getStatusBadge(selectedVendor)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedVendor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedVendor.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GST Number</label>
                  <p className="text-sm text-gray-900">{selectedVendor.gstNumber || 'Not provided'}</p>
                </div>
                                 <div>
                   <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                   <div className="flex space-x-2 mt-1">
                     {selectedVendor.emailVerified ? (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Email Verified</span>
                     ) : (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Email Not Verified</span>
                     )}
                     {selectedVendor.phoneVerified ? (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Phone Verified</span>
                     ) : (
                       <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Phone Not Verified</span>
                     )}
                   </div>
                 </div>
                 {selectedVendor.suspended && selectedVendor.suspensionReason && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Suspension Reason</label>
                     <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md mt-1">{selectedVendor.suspensionReason}</p>
                   </div>
                 )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Addresses</label>
                <div className="space-y-2">
                  {selectedVendor.pickupAddresses.map((address, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{address.addressName}</p>
                          <p className="text-sm text-gray-600">
                            {address.buildingNumber}, {address.streetName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} {address.postalCode}
                          </p>
                          <p className="text-sm text-gray-600">{address.country}</p>
                          {address.landmark && (
                            <p className="text-sm text-gray-500">Landmark: {address.landmark}</p>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            address.addressType === 'primary' ? 'bg-blue-100 text-blue-800' :
                            address.addressType === 'warehouse' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {address.addressType}
                          </span>
                          {address.isDefault && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{new Date(selectedVendor.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="text-sm text-gray-900">{new Date(selectedVendor.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedVendor && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {actionType === 'approve' && 'Approve Vendor'}
                {actionType === 'reject' && 'Reject Vendor'}
                {actionType === 'suspend' && 'Suspend Vendor'}
                {actionType === 'activate' && 'Activate Vendor'}
              </h3>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to {actionType} <strong>{selectedVendor.seller_name}</strong>?
              </p>

                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Reason {actionType === 'suspend' ? '(Required)' : '(Optional)'}
                 </label>
                 <textarea
                   value={actionReason}
                   onChange={(e) => setActionReason(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                   rows={3}
                   placeholder={actionType === 'suspend' ? 'Enter suspension reason (required)...' : 'Enter reason for this action...'}
                   required={actionType === 'suspend'}
                 />
               </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel
                </button>
                                 <button
                   onClick={performAction}
                   disabled={isPerformingAction || (actionType === 'suspend' && !actionReason.trim())}
                   className={`flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                     actionType === 'approve' || actionType === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                     actionType === 'reject' || actionType === 'suspend' ? 'bg-red-600 hover:bg-red-700' :
                     'bg-red-600 hover:bg-red-700'
                   }`}
                 >
                  {isPerformingAction ? 'Processing...' : 
                    actionType === 'approve' ? 'Approve' :
                    actionType === 'reject' ? 'Reject' :
                    actionType === 'suspend' ? 'Suspend' :
                    'Activate'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
} 