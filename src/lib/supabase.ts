import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isValidConfig = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));

if (!isValidConfig) {
  console.warn(
    "Supabase configuration (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) is missing. Active Local Mock Supabase fallback."
  );
}

// Helper to create a Chainable/Thenable query builder for Mock queries
const createMockQueryBuilder = (resultData: any = null, resultError: any = null) => {
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: resultData, error: resultError }),
    single: () => Promise.resolve({ data: resultData, error: resultError }),
    then: (onfulfilled: any) => {
      return Promise.resolve({ data: resultData, error: resultError }).then(onfulfilled);
    }
  };
  return builder;
};

// Mock authentication system with listener triggers and internal state
const mockAuth = {
  _session: null as any,
  _listeners: [] as any[],

  getSession: () => Promise.resolve({ data: { session: mockAuth._session }, error: null }),

  onAuthStateChange: (callback: any) => {
    mockAuth._listeners.push(callback);
    // Fire immediate state callback
    callback(mockAuth._session ? "SIGNED_IN" : "SIGNED_OUT", mockAuth._session);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            mockAuth._listeners = mockAuth._listeners.filter(l => l !== callback);
          }
        }
      }
    };
  },

  signInWithOAuth: (params?: any) => {
    // Generate simulated OAuth callback hash URL pointing to our app with a mock auth parameter
    const mockHash = `#access_token=mock_access_token&refresh_token=mock_refresh_token`;
    const targetUrl = `${window.location.origin}/?mock_auth=true${mockHash}`;
    return Promise.resolve({
      data: { url: targetUrl },
      error: null
    });
  },

  signOut: () => {
    mockAuth._session = null;
    mockAuth._listeners.forEach(l => l("SIGNED_OUT", null));
    return Promise.resolve({ error: null });
  },

  setSession: (sessionParams: { access_token: string; refresh_token: string }) => {
    const mockSession = {
      user: {
        id: "mock-guardian-user-uuid",
        email: "demo.developer@gmail.com",
        user_metadata: {
          full_name: "Guardian Dev (Demo)",
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
        }
      },
      provider_token: "mock-google-calendar-oauth-token",
      ...sessionParams
    };
    mockAuth._session = mockSession;
    mockAuth._listeners.forEach(l => l("SIGNED_IN", mockSession));
    return Promise.resolve({ data: { session: mockSession }, error: null });
  }
};

// Create the unified mock client
const mockSupabase: any = {
  auth: mockAuth,
  from: (table: string) => {
    if (table === "users" || table === "preferences") {
      return createMockQueryBuilder(null, null);
    }
    return createMockQueryBuilder([], null);
  }
};

// Export active client based on configuration availability
export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : mockSupabase;
