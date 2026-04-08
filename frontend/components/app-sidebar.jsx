'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Users, Calendar, Settings, LogOut, TrendingUp, UserCog, Layers3, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
export function AppSidebar({ userRole = 'Admin' }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const pathname = usePathname();
    const normalizedRole = userRole.toLowerCase();
    // Define navigation items based on user role
    const getNavItems = () => {
        if (normalizedRole === 'student') {
            return [
                { label: 'My Batches', href: '/dashboard/student/batches', icon: <Layers3 className="w-5 h-5"/> },
                { label: 'Meetings', href: '/dashboard/student/meetings', icon: <Calendar className="w-5 h-5"/> },
                { label: 'Guidance', href: '/dashboard/student/guidance', icon: <MessageSquare className="w-5 h-5"/> },
                { label: 'Progress', href: '/dashboard/student/progress', icon: <TrendingUp className="w-5 h-5"/> },
                { label: 'Profile', href: '/dashboard/student/settings', icon: <Settings className="w-5 h-5"/> },
            ];
        }
        else if (normalizedRole === 'mentor') {
            return [
                { label: 'Students', href: '/dashboard/mentor/students', icon: <Users className="w-5 h-5"/> },
                { label: 'Meetings', href: '/dashboard/mentor/meetings', icon: <Calendar className="w-5 h-5"/> },
                { label: 'Guidance', href: '/dashboard/mentor/guidance', icon: <MessageSquare className="w-5 h-5"/> },
                { label: 'Profile', href: '/dashboard/mentor/settings', icon: <Settings className="w-5 h-5"/> },
            ];
        }
        else {
            // Admin
            return [
                { label: 'Mentors', href: '/dashboard/hod/mentors', icon: <UserCog className="w-5 h-5"/> },
                { label: 'Meetings', href: '/dashboard/hod/meetings', icon: <Calendar className="w-5 h-5"/> },
                { label: 'Profile', href: '/dashboard/hod/settings', icon: <Settings className="w-5 h-5"/> },
            ];
        }
    };
    const navItems = getNavItems();
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);
    return (<>
      {/* Mobile Toggle */}
      <button onClick={() => setIsMobileOpen((current) => !current)} className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-lg">
        {isMobileOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (<button aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setIsMobileOpen(false)}/>)}

      {/* Sidebar */}
      <aside className={cn('fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300', isMobileOpen ? 'translate-x-0' : '-translate-x-full', 'lg:translate-x-0')}>
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo1.jpeg" alt="Mentor Mentee Hub logo" width={32} height={32} className="object-contain rounded-lg"/>
            <span className="font-semibold text-sm whitespace-nowrap">Mentor Mentee Hub</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (<Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200', isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent')}>
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </Link>);
        })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/login" onClick={() => setIsMobileOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200">
            <LogOut className="w-5 h-5"/>
            <span className="text-sm font-medium">Logout</span>
          </Link>
        </div>
      </aside>

      {/* Content offset */}
      <div className="transition-all duration-300 lg:ml-64"/>
    </>);
}
