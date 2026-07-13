'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SidebarLayout from '../sidebar-layout';

interface Admin {
  id: string;
  email: string;
  admin_name: string;
  role: string;
  permissions: string[];
  isActive: boolean;
}

interface ProductVendor {
  _id: string;
  seller_name?: string;
  shopName?: string;
  email?: string;
}

interface Product {
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
  suspensionReason?: string;
  isFeatured: boolean;
  vendorId?: ProductVendor | string;
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  total: number;
  published: number;
  draft: number;
  suspended: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function calcFinal(base: number, margin: number, discount: number) {
  return Math.round(base * (1 + margin / 100) * (1 - discount / 100) * 100) / 100;
}

function calcMargined(base: number, margin: number) {
  return Math.round(base * (1 + margin / 100) * 100) / 100;
}

function maxDiscount(margin: number) {
  if (margin <= 0) return 0;
  return Math.max(0, Math.floor(((100 * margin) / (100 + margin) - 0.01) * 100) / 100);
}

function vendorLabel(vendor?: ProductVendor | string) {
  if (!vendor || typeof vendor === 'string') return '—';
  return vendor.shopName || vendor.seller_name || vendor.email || '—';
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <SidebarLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        </SidebarLayout>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorIdFilter = searchParams.get('vendorId') || '';
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({ total: 0, published: 0, draft: 0, suspended: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Product | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [marginInput, setMarginInput] = useState('80');
  const [discountInput, setDiscountInput] = useState('0');
  const [featuredInput, setFeaturedInput] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => {
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
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('adminToken');
      router.push('/auth/signin');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (vendorIdFilter) params.append('vendorId', vendorIdFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/products/list?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.data.products);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
        setError(null);
      } else {
        setError(data.message || 'Failed to load products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchTerm, vendorIdFilter]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (admin && canManage) {
      fetchProducts();
    }
  }, [admin, canManage, fetchProducts]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [vendorIdFilter]);

  const openPricing = (product: Product) => {
    setSelected(product);
    setMarginInput(String(product.profitMargin ?? 80));
    setDiscountInput(String(product.discount ?? 0));
    setFeaturedInput(!!product.isFeatured);
    setError(null);
    setShowPricingModal(true);
  };

  const openSuspend = (product: Product) => {
    setSelected(product);
    setSuspendReason(product.suspensionReason || '');
    setError(null);
    setShowSuspendModal(true);
  };

  const preview = useMemo(() => {
    if (!selected) return null;
    const margin = Number(marginInput) || 0;
    const discount = Number(discountInput) || 0;
    const margined = calcMargined(selected.basePrice, margin);
    const finalPrice = calcFinal(selected.basePrice, margin, discount);
    return {
      margined,
      finalPrice,
      valid: finalPrice > selected.basePrice,
      maxDiscount: maxDiscount(margin),
    };
  }, [selected, marginInput, discountInput]);

  const savePricing = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/products/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selected._id,
          profitMargin: Number(marginInput),
          discount: Number(discountInput),
          isFeatured: featuredInput,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to update pricing');
        return;
      }
      setShowPricingModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setError('Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (suspend: boolean) => {
    if (!selected) return;
    if (suspend && !suspendReason.trim()) {
      setError('Suspension reason is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/products/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selected._id,
          suspended: suspend,
          reason: suspendReason,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to update product');
        return;
      }
      setShowSuspendModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      setError('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (p: Product) => {
    if (p.isSuspended) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Suspended</span>;
    }
    if (p.isPublished) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Published</span>;
    }
    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>;
  };

  if (isLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      </SidebarLayout>
    );
  }

  if (!canManage) {
    return (
      <SidebarLayout>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Products</h2>
          <p className="text-gray-500">
            You need the <code className="text-sm bg-gray-100 px-1 rounded">manage_products</code> permission
            (or super admin) to manage product pricing.
          </p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set margin and offers on top of vendor base price. Final must stay above base.
          </p>
          {vendorIdFilter && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm text-blue-800">
              <span>Filtered by vendor</span>
              <Link href="/products" className="font-medium underline hover:no-underline">
                Clear filter
              </Link>
              <Link href="/vendors" className="font-medium underline hover:no-underline">
                Back to vendors
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Published', value: stats.published, color: 'text-green-700' },
            { label: 'Draft', value: stats.draft, color: 'text-yellow-700' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden relative shrink-0">
                            {p.images?.[0] ? (
                              <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.brand} · {p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{vendorLabel(p.vendorId)}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{p.basePrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span>{p.profitMargin}%</span>
                        <span className="block text-[10px] leading-tight text-gray-400">
                          ₹{calcMargined(p.basePrice, p.profitMargin).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.discount}%</td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700">₹{p.finalPrice.toFixed(2)}</td>
                      <td className="px-4 py-3">{statusBadge(p)}</td>
                      <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                        <button
                          onClick={() => openPricing(p)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Pricing
                        </button>
                        {p.isSuspended ? (
                          <button
                            onClick={() => openSuspend(p)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => openSuspend(p)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing modal */}
      {showPricingModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Set pricing</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{selected.name}</p>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Vendor base</span>
                <span className="font-medium">₹{selected.basePrice.toFixed(2)}</span>
              </div>
              {preview && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">After margin</span>
                    <span className="font-medium">₹{preview.margined.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span className="text-gray-700 font-medium">Customer pays</span>
                    <span className={`font-bold ${preview.valid ? 'text-blue-700' : 'text-red-600'}`}>
                      ₹{preview.finalPrice.toFixed(2)}
                    </span>
                  </div>
                  {!preview.valid && (
                    <p className="text-xs text-red-600">
                      Final must be &gt; base. Max discount for this margin: {preview.maxDiscount}%
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profit margin %</label>
              <input
                type="number"
                min={0}
                max={500}
                step={0.01}
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount / offer %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              {preview && (
                <p className="text-xs text-gray-500 mt-1">Max allowed: {preview.maxDiscount}%</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={featuredInput}
                onChange={(e) => setFeaturedInput(e.target.checked)}
                className="rounded border-gray-300"
              />
              Feature this product
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPricingModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={savePricing}
                disabled={saving || !preview?.valid}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save pricing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {showSuspendModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selected.isSuspended ? 'Unsuspend product' : 'Suspend product'}
              </h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{selected.name}</p>
            </div>

            {!selected.isSuspended && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Why is this product being suspended?"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200"
                disabled={saving}
              >
                Cancel
              </button>
              {selected.isSuspended ? (
                <button
                  onClick={() => toggleSuspend(false)}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Unsuspend'}
                </button>
              ) : (
                <button
                  onClick={() => toggleSuspend(true)}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Suspend'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
