'use client';

import { Suspense } from 'react';

export default function AdminForgotPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ForgotPasswordContent />
        </Suspense>
    );
}

// --- Moved all logic here ---
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);

    useEffect(() => {
        if (token) {
            setIsResetMode(true);
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        if (isResetMode) {
            // Handle password reset
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setIsLoading(false);
                return;
            }

            if (password.length < 6) {
                setError('Password must be at least 6 characters long');
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/forgot-password/reset`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        token,
                        password 
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    setSuccess('Password reset successfully! Redirecting to login...');
                    setTimeout(() => {
                        router.push('/auth/signin');
                    }, 2000);
                } else {
                    setError(data.message || 'Failed to reset password');
                }
            } catch {
                setError('An error occurred. Please try again.');
            }
        } else {
            // Handle email submission
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/forgot-password/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok) {
                    setSuccess('Password reset email sent successfully! Please check your inbox.');
                } else {
                    setError(data.message || 'Failed to send reset email');
                }
            } catch {
                setError('An error occurred. Please try again.');
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Image Section */}
            <div className="hidden lg:block lg:w-1/2 fixed left-0 h-screen">
                <Image
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692"
                    alt="Authentication background"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 to-red-600/10 backdrop-blur-[2px]"></div>
            </div>

            {/* Right Side - Forgot Password Form */}
            <div className="flex-1 min-h-screen overflow-y-auto lg:ml-[50%]">
                <div className="flex items-center justify-center p-8 sm:p-12">
                    <div className="w-full max-w-md space-y-8">
                        <div className="text-center">
                            <Image
                                src="/vercel.svg"
                                alt="Logo"
                                width={60}
                                height={60}
                                className="mx-auto mb-4"
                            />
                            <h1 className="text-3xl font-bold text-gray-900">
                                {isResetMode ? 'Set New Password' : 'Reset Password'}
                            </h1>
                            <p className="mt-2 text-sm text-gray-600">
                                {isResetMode 
                                    ? 'Enter your new password below'
                                    : 'Enter your email to receive a password reset link'
                                }
                            </p>
                        </div>

                        <div className="mt-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                                        {success}
                                    </div>
                                )}

                                {isResetMode ? (
                                    <>
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                                New Password
                                            </label>
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                placeholder="Enter your new password"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                                Confirm New Password
                                            </label>
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type="password"
                                                autoComplete="new-password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                placeholder="Confirm your new password"
                                            />
                                        </div>

                                        <div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? 'Resetting...' : 'Reset Password'}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                Email address
                                            </label>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500"
                                                placeholder="Enter your email address"
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                            <div className="mt-6 text-center">
                                <Link href="/auth/signin" className="text-red-600 hover:underline text-sm">
                                    Back to Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 