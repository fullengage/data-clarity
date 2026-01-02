/**
 * Direct Supabase REST API calls
 * Bypasses the client cache for tables that may not be recognized
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface DirectApiOptions {
  accessToken?: string;
}

export async function directInsert<T = any>(
  table: string,
  data: any,
  options?: DirectApiOptions
): Promise<{ data: T | null; error: any }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Prefer': 'return=representation'
    };

    if (options?.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const result = await response.json();
    return { data: Array.isArray(result) ? result[0] : result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function directSelect<T = any>(
  table: string,
  options?: DirectApiOptions & { select?: string; filter?: Record<string, any> }
): Promise<{ data: T[] | null; error: any }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    };

    if (options?.accessToken) {
      headers['Authorization'] = `Bearer ${options.accessToken}`;
    }

    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    const params = new URLSearchParams();
    
    if (options?.select) {
      params.append('select', options.select);
    }

    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const result = await response.json();
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
