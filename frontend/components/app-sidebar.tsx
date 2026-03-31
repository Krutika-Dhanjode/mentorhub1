'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Users, Calendar, Settings, LogOut, TrendingUp, UserCog, Layers3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface AppSidebarProps {
  userRole?: string
}

export function AppSidebar({ userRole = 'HOD' }: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  const normalizedRole = userRole.toLowerCase()

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (normalizedRole === 'student') {
      return [
        { label: 'My Batches', href: '/dashboard/student/batches', icon: <Layers3 className="w-5 h-5" /> },
        { label: 'Meetings', href: '/dashboard/student/meetings', icon: <Calendar className="w-5 h-5" /> },
        { label: 'Add Progress', href: '/dashboard/student/progress', icon: <TrendingUp className="w-5 h-5" /> },
        { label: 'Settings', href: '/dashboard/student/settings', icon: <Settings className="w-5 h-5" /> },
      ]
    } else if (normalizedRole === 'mentor') {
      return [
        { label: 'Students', href: '/dashboard/mentor/students', icon: <Users className="w-5 h-5" /> },
        { label: 'Meetings', href: '/dashboard/mentor/meetings', icon: <Calendar className="w-5 h-5" /> },
        { label: 'Settings', href: '/dashboard/mentor/settings', icon: <Settings className="w-5 h-5" /> },
      ]
    } else {
      // HOD
      return [
        { label: 'Mentors', href: '/dashboard/hod/mentors', icon: <UserCog className="w-5 h-5" /> },
        { label: 'Meetings', href: '/dashboard/hod/meetings', icon: <Calendar className="w-5 h-5" /> },
        { label: 'Settings', href: '/dashboard/hod/settings', icon: <Settings className="w-5 h-5" /> },
      ]
    }
  }

  const navItems = getNavItems()

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 z-40 border-r border-sidebar-border',
          isOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              MM
            </div>
            {isOpen && <span className="font-semibold text-sm whitespace-nowrap">Mentor Hub</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                {item.icon}
                {isOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/login" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-200">
            <LogOut className="w-5 h-5" />
            {isOpen && <span className="text-sm font-medium">Logout</span>}
          </Link>
        </div>
      </aside>

      {/* Content offset */}
      <div className={cn('transition-all duration-300', isOpen ? 'lg:ml-64' : 'lg:ml-20')} />
    </>
  )
}
