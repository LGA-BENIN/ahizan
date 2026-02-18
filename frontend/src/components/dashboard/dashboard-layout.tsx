'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Settings,
    Menu,
    X,
    LogOut,
    User,
    Store,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/app/sign-in/actions';
import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [vendorStatus, setVendorStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const { data } = await query(GetMyVendorProfileQuery, {}, { useAuthToken: true });
                const status = data.myVendorProfile?.status;
                setVendorStatus(status || null);

                if (status === 'PENDING' && pathname !== '/pending') {
                    router.push('/pending');
                } else if (status === 'REJECTED' && pathname !== '/rejected') {
                    router.push('/rejected');
                } else if (status === 'APPROVED' && (pathname === '/pending' || pathname === '/rejected')) {
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error("Failed to check vendor status", error);
                // On error (e.g. not logged in), might want to redirect to login, but let middleware handle that usually
            } finally {
                setIsLoading(false);
            }
        };
        checkStatus();
    }, [pathname, router]);

    const navItems = [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/dashboard/products', label: 'Products', icon: Package },
        { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
        { href: '/dashboard/profile', label: 'Store Profile', icon: Store },
        { href: '/dashboard/page-inscription', label: 'Page Inscription Settings', icon: FileText },
        { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ];

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-16 flex items-center px-6 border-b">
                        <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">AHIZAN</span>
                        <button
                            className="ml-auto lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-orange-50 text-orange-600"
                                            : "text-gray-700 hover:bg-gray-100/80"
                                    )}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t space-y-2">
                        <form action={logoutAction}>
                            <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" type="submit">
                                <LogOut className="mr-2 h-4 w-4" />
                                Log Out
                            </Button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="bg-white border-b h-16 flex items-center px-4 lg:hidden sticky top-0 z-30">
                    <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <span className="ml-4 font-semibold">Dashboard</span>
                </header>

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
