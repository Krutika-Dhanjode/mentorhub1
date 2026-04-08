'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, Search, User } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
export function AppNavbar({ title = 'Dashboard' }) {
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [globalSearch, setGlobalSearch] = useState(searchParams.get('q') || '');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    useEffect(() => {
        setGlobalSearch(searchParams.get('q') || '');
    }, [searchParams]);
    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };
    const handleDeleteAccount = async () => {
        if (isDeletingAccount)
            return;
        const confirmed = window.confirm('Delete your account permanently? This will remove your profile and related data.');
        if (!confirmed)
            return;
        const confirmationText = window.prompt('Type DELETE to confirm account deletion.');
        if (confirmationText !== 'DELETE')
            return;
        setIsDeletingAccount(true);
        try {
            const response = await fetch('/api/account/delete', { method: 'DELETE' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = typeof payload?.error === 'string' ? payload.error : 'Unable to delete account right now.';
                throw new Error(message);
            }
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to delete account right now.';
            alert(message);
        }
        finally {
            setIsDeletingAccount(false);
        }
    };
    const displayName = user?.fullName || user?.name || 'User';
    const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
    const handleGlobalSearchChange = (value) => {
        setGlobalSearch(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
            params.set('q', value);
        }
        else {
            params.delete('q');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    };
    return (<header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6 pl-20 lg:pl-6 shadow-sm">
      {/* Title */}
      <div className="flex flex-1 items-center gap-3">
        <Image src="/logo1.jpeg" alt="Mentor Mentee Hub logo" width={28} height={28} className="h-7 w-7 rounded-sm object-contain" priority/>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h1>
      </div>

      {/* Center - Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"/>
          <Input type="text" placeholder="Search by name, PRN, or email..." value={globalSearch} onChange={(event) => handleGlobalSearchChange(event.target.value)} className="pl-10 bg-input border-border focus-visible:ring-primary"/>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg transition-colors duration-200">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground"/>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-foreground leading-none">{displayName}</span>
                <span className="text-xs text-muted-foreground">{displayRole}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block"/>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-foreground"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{displayRole}</p>
                  </div>
                </div>
                {user && (<div className="text-xs text-muted-foreground pt-1 border-t border-border">
                    <p>Email: {user.email}</p>
                    {user.employmentId && <p>Employment ID: {user.employmentId}</p>}
                    {user.designation && <p>Designation: {user.designation}</p>}
                    {user.department && <p>Department: {user.department}</p>}
                    {user.officeLocation && <p>Office: {user.officeLocation}</p>}
                    {user.phone && <p>Phone: {user.phone}</p>}
                  </div>)}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/dashboard/${user?.role}/settings`)}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={isDeletingAccount} onClick={handleDeleteAccount}>
              {isDeletingAccount ? 'Deleting account...' : 'Delete Account'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>);
}
