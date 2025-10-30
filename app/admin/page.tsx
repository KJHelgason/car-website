'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Search, Eye, TrendingUp, Calendar, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

interface Stats {
  totalSearches: number;
  totalPageViews: number;
  totalUsers: number;
  totalSavedSearches: number;
  totalSavedListings: number;
  activeListings: number;
}

interface DailyChanges {
  totalSearches: number;
  totalPageViews: number;
  totalUsers: number;
  totalSavedSearches: number;
  totalSavedListings: number;
  activeListings: number;
}

interface TimeSeriesData {
  date: string;
  count: number;
}

interface PopularSearch {
  make: string;
  model: string;
  count: number;
}

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalSearches: 0,
    totalPageViews: 0,
    totalUsers: 0,
    totalSavedSearches: 0,
    totalSavedListings: 0,
    activeListings: 0,
  });
  
  const [searchesByDay, setSearchesByDay] = useState<TimeSeriesData[]>([]);
  const [viewsByDay, setViewsByDay] = useState<TimeSeriesData[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyChanges, setDailyChanges] = useState<DailyChanges>({
    totalSearches: 0,
    totalPageViews: 0,
    totalUsers: 0,
    totalSavedSearches: 0,
    totalSavedListings: 0,
    activeListings: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (authorized) {
      fetchStats();
      fetchTimeSeriesData();
      fetchPopularSearches();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
        fetchTimeSeriesData();
        fetchPopularSearches();
      }, 30000); // 30 seconds

      // Cleanup interval on unmount or when dependencies change
      return () => clearInterval(interval);
    }
  }, [authorized, timeRange]);

  async function checkAdminAccess() {
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      router.push('/');
      return;
    }
    setAuthorized(true);
    setLoading(false);
  }

  async function fetchStats() {
    try {
      setIsRefreshing(true);
      
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      // Total searches
      const { count: searchCount } = await supabase
        .from('search_analytics')
        .select('*', { count: 'exact', head: true });

      // Searches from yesterday
      const { count: searchCountYesterday } = await supabase
        .from('search_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Total page views
      const { count: viewCount } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true });

      // Page views from yesterday
      const { count: viewCountYesterday } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Total users (from auth.users - may need service role)
      // For now, count unique user_ids from activity
      const { data: uniqueUsers } = await supabase
        .from('search_analytics')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const { data: uniqueUsersYesterday } = await supabase
        .from('search_analytics')
        .select('user_id')
        .not('user_id', 'is', null)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
      
      const uniqueUserCount = new Set(uniqueUsers?.map(u => u.user_id)).size;
      const uniqueUserCountYesterday = new Set(uniqueUsersYesterday?.map(u => u.user_id)).size;

      // Total saved searches
      const { count: savedSearchCount } = await supabase
        .from('saved_searches')
        .select('*', { count: 'exact', head: true });

      const { count: savedSearchCountYesterday } = await supabase
        .from('saved_searches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Total saved listings
      const { count: savedListingCount } = await supabase
        .from('saved_listings')
        .select('*', { count: 'exact', head: true });

      const { count: savedListingCountYesterday } = await supabase
        .from('saved_listings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

      // Active listings - compare to yesterday's count
      const { count: activeListingCount } = await supabase
        .from('car_listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // For active listings, we'll track the change based on scraped_at
      const { count: activeListingCountYesterday } = await supabase
        .from('car_listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('scraped_at', yesterday.toISOString())
        .lt('scraped_at', today.toISOString());

      setStats({
        totalSearches: searchCount || 0,
        totalPageViews: viewCount || 0,
        totalUsers: uniqueUserCount || 0,
        totalSavedSearches: savedSearchCount || 0,
        totalSavedListings: savedListingCount || 0,
        activeListings: activeListingCount || 0,
      });

      setDailyChanges({
        totalSearches: (searchCountYesterday || 0),
        totalPageViews: (viewCountYesterday || 0),
        totalUsers: uniqueUserCountYesterday || 0,
        totalSavedSearches: (savedSearchCountYesterday || 0),
        totalSavedListings: (savedListingCountYesterday || 0),
        activeListings: (activeListingCountYesterday || 0),
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function fetchTimeSeriesData() {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(now.getDate() - 30);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch searches by day
      const { data: searches } = await supabase
        .from('search_analytics')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Fetch page views by day
      const { data: views } = await supabase
        .from('page_views')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Group by date
      const searchByDate = groupByDate(searches || []);
      const viewsByDate = groupByDate(views || []);

      setSearchesByDay(searchByDate);
      setViewsByDay(viewsByDate);
    } catch (error) {
      console.error('Error fetching time series data:', error);
    }
  }

  async function fetchPopularSearches() {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('make, model')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!data) return;

      // Count occurrences
      const searchCounts = new Map<string, { make: string; model: string; count: number }>();
      
      data.forEach((search) => {
        const key = `${search.make}|${search.model}`;
        const existing = searchCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          searchCounts.set(key, { make: search.make, model: search.model, count: 1 });
        }
      });

      const popular = Array.from(searchCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setPopularSearches(popular);
    } catch (error) {
      console.error('Error fetching popular searches:', error);
    }
  }

  function groupByDate(data: Array<{ created_at: string }>): TimeSeriesData[] {
    const grouped = new Map<string, number>();
    
    data.forEach((item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function handleManualRefresh() {
    fetchStats();
    fetchTimeSeriesData();
    fetchPopularSearches();
  }

  function ChangeIndicator({ change }: { change: number }) {
    if (change === 0) return null;
    
    const isPositive = change > 0;
    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span>{Math.abs(change).toLocaleString()}</span>
      </div>
    );
  }

  function AnimatedNumber({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (value !== displayValue) {
        setIsAnimating(true);
        // Animate the number change
        const duration = 500; // milliseconds
        const steps = 20;
        const increment = (value - displayValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
          currentStep++;
          if (currentStep >= steps) {
            setDisplayValue(value);
            setIsAnimating(false);
            clearInterval(timer);
          } else {
            setDisplayValue(prev => prev + increment);
          }
        }, duration / steps);

        return () => clearInterval(timer);
      }
    }, [value, displayValue]);

    return (
      <div className={`text-2xl font-bold transition-all duration-300 ${isAnimating ? 'text-blue-600 scale-105' : ''}`}>
        {Math.round(displayValue).toLocaleString()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <span className="text-sm font-medium text-red-600">LIVE</span>
              </div>
            </div>
            <p className="text-gray-600">Analytics and statistics for Allir Bilar</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4 mb-2">
              {isRefreshing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Updating...</span>
                </div>
              )}
              {lastUpdated && (
                <div className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-md rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.totalSearches} />
              <ChangeIndicator change={dailyChanges.totalSearches} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.totalPageViews} />
              <ChangeIndicator change={dailyChanges.totalPageViews} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.totalUsers} />
              <ChangeIndicator change={dailyChanges.totalUsers} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.totalSavedSearches} />
              <ChangeIndicator change={dailyChanges.totalSavedSearches} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Listings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.totalSavedListings} />
              <ChangeIndicator change={dailyChanges.totalSavedListings} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <AnimatedNumber value={stats.activeListings} />
              <ChangeIndicator change={dailyChanges.activeListings} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Yesterday's activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs defaultValue="searches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="searches">Searches</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="popular">Popular Searches</TabsTrigger>
        </TabsList>

        <TabsContent value="searches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Search Analytics</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeRange('day')}
                    className={`px-3 py-1 text-sm rounded ${timeRange === 'day' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setTimeRange('week')}
                    className={`px-3 py-1 text-sm rounded ${timeRange === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1 text-sm rounded ${timeRange === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setTimeRange('year')}
                    className={`px-3 py-1 text-sm rounded ${timeRange === 'year' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
                  >
                    Year
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {searchesByDay.length > 0 ? (
                  searchesByDay.map((item) => (
                    <div key={item.date} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">{new Date(item.date).toLocaleDateString()}</span>
                      <span className="font-semibold">{item.count} searches</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {viewsByDay.length > 0 ? (
                  viewsByDay.map((item) => (
                    <div key={item.date} className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-gray-600">{new Date(item.date).toLocaleDateString()}</span>
                      <span className="font-semibold">{item.count} views</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Most Searched Cars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {popularSearches.length > 0 ? (
                  popularSearches.map((search, index) => (
                    <div key={`${search.make}-${search.model}`} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                        <span className="font-medium">{search.make} {search.model}</span>
                      </div>
                      <span className="text-sm text-gray-600">{search.count} searches</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
