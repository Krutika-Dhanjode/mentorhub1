'use client'

import { ChevronDown, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavbarProps {
  title?: string
}

export function AppNavbar({ title = 'Dashboard' }: NavbarProps) {
  const { user } = useUser()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = user?.fullName || user?.name || 'User'
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'
  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-6 shadow-sm">
      {/* Title */}
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>

      {/* Center - Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 bg-input border-border focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-foreground leading-none">{displayName}</span>
                <span className="text-xs text-muted-foreground">{displayRole}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
                  </div>
                </div>
                {user && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                    <p>Email: {user.email}</p>
                    {user.employmentId && <p>Employment ID: {user.employmentId}</p>}
                    {user.designation && <p>Designation: {user.designation}</p>}
                    {user.department && <p>Department: {user.department}</p>}
                    {user.officeLocation && <p>Office: {user.officeLocation}</p>}
                    {user.phone && <p>Phone: {user.phone}</p>}
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/dashboard/${user?.role}/settings`)}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
