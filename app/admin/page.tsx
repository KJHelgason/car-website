'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Search, Eye, TrendingUp, Calendar, RefreshCw, ArrowUp, ArrowDown, Activity, MousePointerClick, Star, AlertTriangle, Target, Clock } from 'lucide-react';

interface Stats {
  totalSearches: number;
  totalPageViews: number;
  totalUsers: number;
  totalSavedSearches: number;
  totalSavedListings: number;
  activeListings: number;
  activeUsersNow: number;
  avgSessionDuration: number;
  conversionRate: number;
  mostViewedListings: Array<{ id: string; make: string; model: string; views: number }>;
}

interface DailyChanges {
  totalSearches: number;
  totalPageViews: number;
  totalUsers: number;
  totalSavedSearches: number;
  totalSavedListings: number;
  activeListings: number;
  activeUsersNow: number;
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

interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

interface ConversionFunnel {
  stage: string;
  count: number;
  conversionRate: number;
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
    activeUsersNow: 0,
    avgSessionDuration: 0,
    conversionRate: 0,
    mostViewedListings: [],
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
    activeUsersNow: 0,
  });
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [statTimeSeriesData, setStatTimeSeriesData] = useState<Record<string, TimeSeriesData[]>>({});
  const [graphTimeRange, setGraphTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (authorized) {
      fetchStats();
      fetchTimeSeriesData();
      fetchPopularSearches();
      fetchAllStatTimeSeries();
      fetchConversionFunnel();
      generateAlerts();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
        fetchTimeSeriesData();
        fetchPopularSearches();
        fetchConversionFunnel();
        generateAlerts();
        if (expandedStat) {
          fetchStatTimeSeries(expandedStat);
        }
      }, 30000); // 30 seconds

      // Cleanup interval on unmount or when dependencies change
      return () => clearInterval(interval);
    }
  }, [authorized, timeRange, expandedStat]);

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
      
      // Active users NOW (activity in last 5 minutes)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const { data: recentActivity } = await supabase
        .from('page_views')
        .select('session_id')
        .gte('created_at', fiveMinutesAgo.toISOString());
      
      const activeNow = new Set(recentActivity?.map(a => a.session_id)).size;
      
      const { data: recentActivityYesterday } = await supabase
        .from('page_views')
        .select('session_id')
        .gte('created_at', new Date(yesterday.getTime() + (now.getHours() * 60 + now.getMinutes() - 5) * 60 * 1000).toISOString())
        .lt('created_at', new Date(yesterday.getTime() + (now.getHours() * 60 + now.getMinutes()) * 60 * 1000).toISOString());
      
      const activeNowYesterday = new Set(recentActivityYesterday?.map(a => a.session_id)).size;
      
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

      // Average session duration (in minutes)
      const { data: sessions } = await supabase
        .from('page_views')
        .select('session_id, created_at')
        .order('created_at', { ascending: true });
      
      const sessionTimes = new Map<string, { first: Date; last: Date }>();
      sessions?.forEach(view => {
        const time = new Date(view.created_at);
        if (!sessionTimes.has(view.session_id)) {
          sessionTimes.set(view.session_id, { first: time, last: time });
        } else {
          const existing = sessionTimes.get(view.session_id)!;
          if (time < existing.first) existing.first = time;
          if (time > existing.last) existing.last = time;
        }
      });
      
      let totalDuration = 0;
      sessionTimes.forEach(({ first, last }) => {
        totalDuration += (last.getTime() - first.getTime()) / 1000 / 60; // minutes
      });
      const avgSessionDuration = sessionTimes.size > 0 ? totalDuration / sessionTimes.size : 0;

      // Conversion rate (users who saved listings / users who searched)
      const { data: usersWhoSaved } = await supabase
        .from('saved_listings')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const uniqueSavers = new Set(usersWhoSaved?.map(u => u.user_id)).size;
      const conversionRate = uniqueUserCount > 0 ? (uniqueSavers / uniqueUserCount) * 100 : 0;

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

      // Most viewed listings
      const { data: allListingViews } = await supabase
        .from('page_views')
        .select('page_path')
        .limit(5000);
      
      const listingViews = allListingViews?.filter(view => view.page_path.includes('/listing/')) || [];
      
      const viewCounts = new Map<string, number>();
      listingViews?.forEach(view => {
        const match = view.page_path.match(/\/listing\/([^/?]+)/);
        if (match) {
          const listingId = match[1];
          viewCounts.set(listingId, (viewCounts.get(listingId) || 0) + 1);
        }
      });
      
      const topListingIds = Array.from(viewCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
      
      const mostViewedListings: Array<{ id: string; make: string; model: string; views: number }> = [];
      for (const listingId of topListingIds) {
        const { data: listing } = await supabase
          .from('car_listings')
          .select('id, make, model')
          .eq('id', listingId)
          .single();
        
        if (listing) {
          mostViewedListings.push({
            id: listing.id,
            make: listing.make,
            model: listing.model,
            views: viewCounts.get(listingId) || 0,
          });
        }
      }

      setStats({
        totalSearches: searchCount || 0,
        totalPageViews: viewCount || 0,
        totalUsers: uniqueUserCount || 0,
        totalSavedSearches: savedSearchCount || 0,
        totalSavedListings: savedListingCount || 0,
        activeListings: activeListingCount || 0,
        activeUsersNow: activeNow,
        avgSessionDuration,
        conversionRate,
        mostViewedListings,
      });

      setDailyChanges({
        totalSearches: (searchCountYesterday || 0),
        totalPageViews: (viewCountYesterday || 0),
        totalUsers: uniqueUserCountYesterday || 0,
        totalSavedSearches: (savedSearchCountYesterday || 0),
        totalSavedListings: (savedListingCountYesterday || 0),
        activeListings: (activeListingCountYesterday || 0),
        activeUsersNow: activeNowYesterday,
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
      const startDate = new Date();
      
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

  async function fetchConversionFunnel() {
    try {
      // Get unique sessions/users at each stage
      const { data: allViews } = await supabase
        .from('page_views')
        .select('session_id');
      
      const { data: searches } = await supabase
        .from('search_analytics')
        .select('session_id')
        .not('session_id', 'is', null);
      
      const { data: allPageViews } = await supabase
        .from('page_views')
        .select('session_id, page_path');
      
      const listingViews = allPageViews?.filter(view => view.page_path.includes('/listing/')) || [];
      
      const { data: savedListings } = await supabase
        .from('saved_listings')
        .select('user_id')
        .not('user_id', 'is', null);
      
      const uniqueVisitors = new Set(allViews?.map(v => v.session_id)).size;
      const uniqueSearchers = new Set(searches?.map(s => s.session_id)).size;
      const uniqueListingViewers = new Set(listingViews?.map(v => v.session_id)).size;
      const uniqueSavers = new Set(savedListings?.map(s => s.user_id)).size;
      
      const funnel: ConversionFunnel[] = [
        { stage: 'Visitors', count: uniqueVisitors, conversionRate: 100 },
        { stage: 'Searched', count: uniqueSearchers, conversionRate: uniqueVisitors > 0 ? (uniqueSearchers / uniqueVisitors) * 100 : 0 },
        { stage: 'Viewed Listings', count: uniqueListingViewers, conversionRate: uniqueVisitors > 0 ? (uniqueListingViewers / uniqueVisitors) * 100 : 0 },
        { stage: 'Saved Listings', count: uniqueSavers, conversionRate: uniqueVisitors > 0 ? (uniqueSavers / uniqueVisitors) * 100 : 0 },
      ];
      
      setConversionFunnel(funnel);
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
    }
  }

  async function generateAlerts() {
    try {
      const newAlerts: Alert[] = [];
      const now = new Date();
      
      // Check for traffic spike (compare last hour to previous hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      const { count: lastHourViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneHourAgo.toISOString());
      
      const { count: previousHourViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoHoursAgo.toISOString())
        .lt('created_at', oneHourAgo.toISOString());
      
      if (previousHourViews && lastHourViews && lastHourViews > previousHourViews * 1.5) {
        newAlerts.push({
          type: 'success',
          message: `Traffic spike detected! ${lastHourViews} views in the last hour (${Math.round(((lastHourViews - previousHourViews) / previousHourViews) * 100)}% increase)`,
          timestamp: now,
        });
      } else if (previousHourViews && lastHourViews && lastHourViews < previousHourViews * 0.5) {
        newAlerts.push({
          type: 'warning',
          message: `Traffic drop detected. ${lastHourViews} views in the last hour (${Math.round(((previousHourViews - lastHourViews) / previousHourViews) * 100)}% decrease)`,
          timestamp: now,
        });
      }
      
      // Check for low conversion rate
      if (stats.conversionRate > 0 && stats.conversionRate < 5) {
        newAlerts.push({
          type: 'warning',
          message: `Low conversion rate: ${stats.conversionRate.toFixed(1)}%. Consider improving listing quality or search experience.`,
          timestamp: now,
        });
      } else if (stats.conversionRate >= 15) {
        newAlerts.push({
          type: 'success',
          message: `Excellent conversion rate: ${stats.conversionRate.toFixed(1)}%! Users are highly engaged.`,
          timestamp: now,
        });
      }
      
      // Check if no active users
      if (stats.activeUsersNow === 0) {
        newAlerts.push({
          type: 'info',
          message: 'No active users in the last 5 minutes. Consider checking site availability.',
          timestamp: now,
        });
      } else if (stats.activeUsersNow >= 10) {
        newAlerts.push({
          type: 'success',
          message: `${stats.activeUsersNow} users currently active on the site!`,
          timestamp: now,
        });
      }
      
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  }

  function groupByDate(data: Array<{ created_at: string; user_id?: string }>): TimeSeriesData[] {
    const grouped = new Map<string, Set<string> | number>();
    
    data.forEach((item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      
      // If user_id exists, track unique users per day
      if (item.user_id !== undefined) {
        if (!grouped.has(date)) {
          grouped.set(date, new Set<string>());
        }
        (grouped.get(date) as Set<string>).add(item.user_id);
      } else {
        // Otherwise just count records
        const current = grouped.get(date);
        if (typeof current === 'number') {
          grouped.set(date, current + 1);
        } else if (!current) {
          grouped.set(date, 1);
        }
      }
    });

    return Array.from(grouped.entries())
      .map(([date, value]) => ({ 
        date, 
        count: value instanceof Set ? value.size : value as number 
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async function fetchStatTimeSeries(statName: string, timeRange?: 'day' | 'week' | 'month' | 'year') {
    try {
      const now = new Date();
      const startDate = new Date();
      const range = timeRange || graphTimeRange;

      switch (range) {
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

      let data: Array<{ created_at: string; user_id?: string }> | null = null;

      switch (statName) {
        case 'searches':
          const { data: searches } = await supabase
            .from('search_analytics')
            .select('created_at')
            .gte('created_at', startDate.toISOString());
          data = searches;
          break;
        case 'pageViews':
          const { data: views } = await supabase
            .from('page_views')
            .select('created_at')
            .gte('created_at', startDate.toISOString());
          data = views;
          break;
        case 'users':
          const { data: userActivity } = await supabase
            .from('search_analytics')
            .select('created_at, user_id')
            .not('user_id', 'is', null)
            .gte('created_at', startDate.toISOString());
          data = userActivity;
          break;
        case 'savedSearches':
          const { data: savedSearches } = await supabase
            .from('saved_searches')
            .select('created_at')
            .gte('created_at', startDate.toISOString());
          data = savedSearches;
          break;
        case 'savedListings':
          const { data: savedListings } = await supabase
            .from('saved_listings')
            .select('created_at')
            .gte('created_at', startDate.toISOString());
          data = savedListings;
          break;
        case 'activeListings':
          const { data: activeListings } = await supabase
            .from('car_listings')
            .select('scraped_at')
            .eq('is_active', true)
            .gte('scraped_at', startDate.toISOString());
          data = activeListings?.map(item => ({ created_at: item.scraped_at })) || null;
          break;
      }

      if (data && data.length > 0) {
        const timeSeries = groupByDate(data);
        // Limit to 30 bars max
        const limitedTimeSeries = timeSeries.slice(-30);
        console.log(`[${statName}] Time series data:`, limitedTimeSeries);
        setStatTimeSeriesData(prev => ({ ...prev, [statName]: limitedTimeSeries }));
      } else {
        console.log(`[${statName}] No data found for range:`, range);
        // Set empty array so we know it was attempted
        setStatTimeSeriesData(prev => ({ ...prev, [statName]: [] }));
      }
    } catch (error) {
      console.error(`Error fetching time series for ${statName}:`, error);
    }
  }

  async function fetchAllStatTimeSeries() {
    await Promise.all([
      fetchStatTimeSeries('searches'),
      fetchStatTimeSeries('pageViews'),
      fetchStatTimeSeries('users'),
      fetchStatTimeSeries('savedSearches'),
      fetchStatTimeSeries('savedListings'),
    ]);
  }

  function handleStatClick(statName: string) {
    if (expandedStat === statName) {
      setExpandedStat(null);
    } else {
      setExpandedStat(statName);
      fetchStatTimeSeries(statName, graphTimeRange);
    }
  }

  function handleGraphTimeRangeChange(range: 'day' | 'week' | 'month' | 'year') {
    setGraphTimeRange(range);
    if (expandedStat) {
      fetchStatTimeSeries(expandedStat, range);
    }
  }

  function handleManualRefresh() {
    fetchStats();
    fetchTimeSeriesData();
    fetchPopularSearches();
    fetchConversionFunnel();
    generateAlerts();
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

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : alert.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                alert.type === 'warning'
                  ? 'text-yellow-600'
                  : alert.type === 'success'
                  ? 'text-green-600'
                  : 'text-blue-600'
              }`} />
              <div className="flex-1">
                <p className="font-medium">{alert.message}</p>
                <p className="text-xs opacity-75 mt-1">{alert.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users Now</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <AnimatedNumber value={stats.activeUsersNow} />
              <span className="text-sm text-green-600 font-medium">LIVE</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Last 5 minutes</p>
              <ChangeIndicator change={stats.activeUsersNow - dailyChanges.activeUsersNow} />
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.activeListings} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Available cars</p>
              <ChangeIndicator change={dailyChanges.activeListings} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overview Stats - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card 
          className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${expandedStat === 'searches' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleStatClick('searches')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.totalSearches} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Today: {dailyChanges.totalSearches.toLocaleString()}</p>
              <ChangeIndicator change={dailyChanges.totalSearches} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${expandedStat === 'pageViews' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleStatClick('pageViews')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.totalPageViews} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Today: {dailyChanges.totalPageViews.toLocaleString()}</p>
              <ChangeIndicator change={dailyChanges.totalPageViews} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${expandedStat === 'users' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleStatClick('users')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.totalUsers} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">New today: {dailyChanges.totalUsers.toLocaleString()}</p>
              <ChangeIndicator change={dailyChanges.totalUsers} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${expandedStat === 'savedSearches' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleStatClick('savedSearches')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.totalSavedSearches} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">New today: {dailyChanges.totalSavedSearches.toLocaleString()}</p>
              <ChangeIndicator change={dailyChanges.totalSavedSearches} />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${expandedStat === 'savedListings' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleStatClick('savedListings')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Listings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={stats.totalSavedListings} />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">New today: {dailyChanges.totalSavedListings.toLocaleString()}</p>
              <ChangeIndicator change={dailyChanges.totalSavedListings} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Viewed Listings */}
      {stats.mostViewedListings.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Most Viewed Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.mostViewedListings.map((listing, index) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{listing.make} {listing.model}</p>
                      <p className="text-sm text-gray-500">{listing.views} views</p>
                    </div>
                  </div>
                  <a
                    href={`/listing/${listing.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Width Graph Below Stats */}
      {expandedStat && statTimeSeriesData[expandedStat] && statTimeSeriesData[expandedStat].length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {expandedStat === 'searches' && 'Total Searches Over Time'}
                {expandedStat === 'pageViews' && 'Total Page Views Over Time'}
                {expandedStat === 'users' && 'Total Users Over Time'}
                {expandedStat === 'savedSearches' && 'Saved Searches Over Time'}
                {expandedStat === 'savedListings' && 'Saved Listings Over Time'}
                {expandedStat === 'activeListings' && 'Active Listings Over Time'}
              </CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGraphTimeRangeChange('day')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${graphTimeRange === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Day
                </button>
                <button
                  onClick={() => handleGraphTimeRangeChange('week')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${graphTimeRange === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => handleGraphTimeRangeChange('month')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${graphTimeRange === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => handleGraphTimeRangeChange('year')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${graphTimeRange === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Year
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {statTimeSeriesData[expandedStat] && statTimeSeriesData[expandedStat].length > 0 ? (
                <>
                  {/* Bar Graph */}
                  <div className="flex items-end justify-between gap-1 h-64">
                    {statTimeSeriesData[expandedStat].map((item, index) => {
                      const maxCount = Math.max(...statTimeSeriesData[expandedStat].map(d => d.count));
                      const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={item.date} className="flex-1 flex flex-col items-center group">
                          <div className="relative w-full h-64 flex flex-col justify-end">
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap pointer-events-none z-10">
                              {item.count.toLocaleString()}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                            {/* Bar */}
                            <div 
                              className="w-full bg-blue-500 hover:bg-blue-600 transition-all rounded-t cursor-pointer min-h-[2px]"
                              style={{ height: `${heightPercent}%` }}
                            ></div>
                          </div>
                          {/* Date label - show every few bars to avoid crowding */}
                          {(statTimeSeriesData[expandedStat].length <= 15 || index % Math.ceil(statTimeSeriesData[expandedStat].length / 15) === 0) && (
                            <div className="text-xs text-gray-500 mt-2 text-center">
                              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500 text-center">No data available for the selected time range</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
