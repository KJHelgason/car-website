import { supabase } from './supabase';

// Generate a simple session ID for anonymous users
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

// Track page view
export async function trackPageView(pagePath: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('page_views').insert({
      user_id: user?.id || null,
      page_path: pagePath,
      session_id: getSessionId(),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      referrer: typeof window !== 'undefined' ? document.referrer : null,
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.debug('Error tracking page view:', error);
  }
}

// Track search
export async function trackSearch(params: {
  make: string;
  model: string;
  year?: string;
  make_norm?: string;
  model_base?: string;
  results_count?: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('search_analytics').insert({
      user_id: user?.id || null,
      make: params.make,
      model: params.model,
      year: params.year || null,
      make_norm: params.make_norm || null,
      model_base: params.model_base || null,
      session_id: getSessionId(),
      results_count: params.results_count || null,
    });
  } catch (error) {
    console.debug('Error tracking search:', error);
  }
}

// Track user activity
export async function trackActivity(activityType: string, metadata?: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return; // Only track authenticated user activities
    
    await supabase.from('user_activity').insert({
      user_id: user.id,
      activity_type: activityType,
      metadata: metadata || null,
    });
  } catch (error) {
    console.debug('Error tracking activity:', error);
  }
}
