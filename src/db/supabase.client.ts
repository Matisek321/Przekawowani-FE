import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);


export const DEFAULT_USER_ID = 'e10590bb-e06c-4013-bbbc-c17cff05907d'