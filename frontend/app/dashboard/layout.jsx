'use client';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { AppNavbar } from '@/components/app-navbar';

export default function DashboardLayout({ children }) {
    const pathname = usePathname();

    // If on the landing page, don't show sidebar/navbar
    if (pathname === '/dashboard') {
        return <>{children}</>;
    }

    // Determine role based on current path for sidebar
    let userRole = 'Admin';
    let title = 'Dashboard';

    if (pathname.startsWith('/dashboard/mentor')) {
        userRole = 'mentor';
        if (pathname.includes('/students/')) {
            title = 'Student Report';
        } else if (pathname.includes('/students')) {
            title = 'My Students';
        } else if (pathname.includes('/meetings')) {
            title = 'Meetings';
        } else if (pathname.includes('/guidance')) {
            title = 'Guidance';
        } else if (pathname.includes('/settings')) {
            title = 'Profile';
        } else if (pathname.includes('/batches') && pathname.includes('/chat')) {
            title = 'Group Guidance';
        } else if (pathname === '/dashboard/mentor/chat') {
            title = 'Group Guidance';
        } else {
            title = 'Mentor Dashboard';
        }
    } else if (pathname.startsWith('/dashboard/student')) {
        userRole = 'student';
        if (pathname.includes('/batches') && pathname.includes('/chat')) {
            title = 'Group Guidance';
        } else if (pathname === '/dashboard/student/chat') {
            title = 'Group Guidance';
        } else if (pathname.includes('/batches')) {
            title = 'My Batches';
        } else if (pathname.includes('/meetings')) {
            title = 'My Meetings';
        } else if (pathname.includes('/guidance')) {
            title = 'Guidance';
        } else if (pathname.includes('/progress')) {
            title = 'Progress';
        } else if (pathname.includes('/settings')) {
            title = 'Profile';
        } else {
            title = 'Student Dashboard';
        }
    } else if (pathname.startsWith('/dashboard/hod')) {
        userRole = 'hod';
        if (pathname.includes('/students/')) {
            title = 'Student Report';
        } else if (pathname.includes('/mentors')) {
            title = 'Mentors';
        } else if (pathname.includes('/progress')) {
            title = 'Progress';
        } else if (pathname.includes('/meetings')) {
            title = 'Meetings';
        } else if (pathname.includes('/settings')) {
            title = 'Profile';
        } else {
            title = 'Admin Dashboard';
        }
    }

    return (
        <div className="flex h-screen bg-background">
            <AppSidebar userRole={userRole} />
            <div className="flex-1 flex flex-col">
                <Suspense fallback={<div className="sticky top-0 z-30 h-16 border-b border-border bg-card" />}>
                    <AppNavbar title={title} />
                </Suspense>
                <main className="flex-1 overflow-auto">
                    <div className="p-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
