'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  LogOut,
  ChevronDown,
  FlaskConical,
  User as UserIcon,
} from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, logout, isAuthenticated, isDevMode } = useAuthStore();
  const isDemoAccount = isDevMode();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {initials}
          </div>
          <span className="hidden sm:inline-block max-w-[100px] truncate">
            {user.name.split(' ')[0]}
          </span>
          {isDemoAccount && (
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-1.5 py-0 gap-1">
              <FlaskConical className="h-3 w-3" />
              Demo
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              {isDemoAccount && (
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  Demo
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Account Type Info */}
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            {isDemoAccount ? (
              <>
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Demo Account</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  Dev Mode
                </Badge>
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Signed In</span>
              </>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-500 focus:text-red-500 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
