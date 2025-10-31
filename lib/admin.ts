import { supabase } from './supabase';

const ADMIN_EMAILS = [
  'kjartandaniel01@gmail.com',
  'maggipje@gmail.com'
];

export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }
    
    return ADMIN_EMAILS.includes(user.email || '');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function requireAdmin(): Promise<boolean> {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }
  return true;
}
