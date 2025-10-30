'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Heart, Search, LogOut, TrendingDown, Shield } from 'lucide-react';
import { TipsButton } from '@/components/ui/tipsbutton';
import { SavedSearchesDropdown } from '@/components/SavedSearchesDropdown';
import { SavedListingsDropdown } from '@/components/SavedListingsDropdown';
import { useState, useEffect } from 'react';
import { isAdmin } from '@/lib/admin';

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';
  const [adminStatus, setAdminStatus] = useState(false);

  useEffect(() => {
    if (user) {
      isAdmin().then(setAdminStatus);
    } else {
      setAdminStatus(false);
    }
  }, [user]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Navigate to home and clear all URL parameters
    router.push('/');
    // Force a page refresh to reset state
    if (isHomePage) {
      window.location.href = '/';
    }
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            Allir Bilar
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {/* Tips Button - Only on home page */}
            {isHomePage && <TipsButton variant="ghost" size="sm" className="cursor-pointer"/>}
            
            {/* Saved Searches Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved Searches</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0">
                <SavedSearchesDropdown />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Saved Listings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Saved</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0">
                <SavedListingsDropdown />
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/sold-cars">
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <TrendingDown className="h-4 w-4" />
                <span className="hidden md:inline">Sold Cars</span>
              </Button>
            </Link>
            
            {loading ? (
              <div className="w-20 h-9 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/saved-listings" className="cursor-pointer">
                        <Heart className="h-4 w-4 mr-2" />
                        Saved Listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-searches" className="cursor-pointer">
                        <Search className="h-4 w-4 mr-2" />
                        Saved Searches
                      </Link>
                    </DropdownMenuItem>
                    {adminStatus && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-blue-600 font-semibold">
                            <Shield className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="cursor-pointer">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
