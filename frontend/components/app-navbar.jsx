'use client';
import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Search, User } from 'lucide-react';
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
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const supabase = createClient();
    useEffect(() => {
        setGlobalSearch(searchParams.get('q') || '');
    }, [searchParams]);
    const handleLogout = async () => {
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
    const fetchNotificationsByEmail = async () => {
        if (!user?.email)
            return [];
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('email', user.email)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error('Error fetching notifications:', error.message);
            return [];
        }
        return data || [];
    };
    const fetchNotifications = async () => {
        if (!user?.email) {
            setNotifications([]);
            return;
        }
        setNotificationsLoading(true);
        const rows = await fetchNotificationsByEmail();
        setNotifications(rows);
        setNotificationsLoading(false);
    };
    const deleteSeenNotifications = async () => {
        if (!user?.email)
            return;
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('email', user.email);
        if (error) {
            console.error('Error clearing notifications:', error.message);
            return;
        }
    };
    const handleNotificationOpenChange = async (open) => {
        setNotificationOpen(open);
        if (!open)
            return;
        await fetchNotifications();
        await deleteSeenNotifications();
    };
    useEffect(() => {
        if (!user?.email)
            return;
        fetchNotifications();
        const intervalId = setInterval(() => {
            fetchNotifications();
        }, 30000);
        return () => clearInterval(intervalId);
    }, [user?.email]);
    return (<header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center justify-between px-4 lg:px-6 pl-20 lg:pl-6 shadow-sm">
      {/* Title */}
      <div className="flex flex-1 items-center gap-3">
        <Image src="/logo1.jpeg" alt="Mentor Mentee Hub logo" width={28} height={28} className="h-7 w-7 rounded-sm object-contain" priority/>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h1>
      </div>

      {/* Center - Search (hidden on mobile) */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 items-center gap-3">
        <DropdownMenu open={notificationOpen} onOpenChange={handleNotificationOpenChange}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary transition-colors" aria-label="Notifications">
              <Bell className="h-4 w-4 text-foreground"/>
              {notifications.length > 0 && (<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-5 text-destructive-foreground">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsLoading ? (<DropdownMenuItem disabled>Loading...</DropdownMenuItem>) : notifications.length === 0 ? (<DropdownMenuItem disabled>No new notifications</DropdownMenuItem>) : (notifications.map((item) => (<DropdownMenuItem key={item.id} className="block cursor-default focus:bg-transparent">
                  <p className="text-sm font-medium capitalize">{item.type || 'update'}</p>
                  <p className="mt-1 whitespace-normal text-xs text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                  </p>
                </DropdownMenuItem>)))}
          </DropdownMenuContent>
        </DropdownMenu>
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
