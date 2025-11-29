'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Heart, Search, LogOut, TrendingDown, Shield, Globe, BookOpen } from 'lucide-react';
import { TipsButton } from '@/components/ui/tipsbutton';
import { SavedSearchesDropdown } from '@/components/SavedSearchesDropdown';
import { SavedListingsDropdown } from '@/components/SavedListingsDropdown';
import { useState, useEffect } from 'react';
import { isAdmin } from '@/lib/admin';

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
            className="flex items-center gap-3 text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            <Image 
              src="/logo.png" 
              alt="Allir Bilar Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <span>Allir Bilar</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            {/* Tips Button - Only on home page */}
            {isHomePage && <TipsButton variant="ghost" size="sm" className="cursor-pointer"/>}
            
            {/* Saved Searches Dropdown - Hidden up to large screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 cursor-pointer hidden lg:flex">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('header.savedSearches')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0">
                <SavedSearchesDropdown />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Saved Listings Dropdown - Hidden up to large screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 cursor-pointer hidden lg:flex">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('header.saved')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0">
                <SavedListingsDropdown />
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/sold-cars">
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <TrendingDown className="h-4 w-4" />
                <span className="hidden md:inline">{t('header.sold')}</span>
              </Button>
            </Link>

            <Link href="/cars">
              <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">{t('header.guides')}</span>
              </Button>
            </Link>
            
            {/* Language Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'is' : 'en')}
              className="gap-2 cursor-pointer"
              title={language === 'en' ? 'Switch to Icelandic' : 'Skipta yfir á ensku'}
            >
              <Globe className="h-4 w-4" />
              <span className="font-semibold">{language === 'en' ? 'IS' : 'EN'}</span>
            </Button>
            
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
                        {t('header.saved')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/saved-searches" className="cursor-pointer">
                        <Search className="h-4 w-4 mr-2" />
                        {t('header.savedSearches')}
                      </Link>
                    </DropdownMenuItem>
                    {adminStatus && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer text-blue-600 font-semibold">
                            <Shield className="h-4 w-4 mr-2" />
                            {t('header.admin')}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('header.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Desktop: Show both Login and Signup */}
                <Link href="/login" className="hidden sm:inline-block">
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    {t('header.login')}
                  </Button>
                </Link>
                <Link href="/signup" className="hidden sm:inline-block">
                  <Button size="sm" className="cursor-pointer">
                    {t('header.signup')}
                  </Button>
                </Link>
                {/* Mobile: Show only Login button */}
                <Link href="/login" className="sm:hidden">
                  <Button size="sm" className="cursor-pointer">
                    {t('header.login')}
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
