'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { AppNavbar } from '@/components/app-navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // If on the landing page, don't show sidebar/navbar
  if (pathname === '/dashboard') {
    return <>{children}</>
  }

  // Determine role based on current path for sidebar
  let userRole = 'HOD'
  let title = 'Dashboard'

  if (pathname.startsWith('/dashboard/mentor')) {
    userRole = 'mentor'
    if (pathname.includes('/students/')) {
      title = 'Student Report'
    } else if (pathname.includes('/students')) {
      title = 'My Students'
    } else if (pathname.includes('/meetings')) {
      title = 'Meetings'
    } else if (pathname.includes('/settings')) {
      title = 'Settings'
    } else {
      title = 'Mentor Dashboard'
    }
  } else if (pathname.startsWith('/dashboard/student')) {
    userRole = 'student'
    if (pathname.includes('/batches')) {
      title = 'My Batches'
    } else if (pathname.includes('/meetings')) {
      title = 'My Meetings'
    } else if (pathname.includes('/progress')) {
      title = 'Add Progress'
    } else if (pathname.includes('/settings')) {
      title = 'Settings'
    } else {
      title = 'Student Dashboard'
    }
  } else if (pathname.startsWith('/dashboard/hod')) {
    userRole = 'hod'
    if (pathname.includes('/mentors')) {
      title = 'Mentors'
    } else if (pathname.includes('/meetings')) {
      title = 'Meetings'
    } else if (pathname.includes('/settings')) {
      title = 'Settings'
    } else {
      title = 'HOD Dashboard'
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar userRole={userRole} />
      <div className="flex-1 flex flex-col">
        <AppNavbar title={title} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
