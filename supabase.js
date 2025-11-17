import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseKey = Constants.expoConfig.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = 'https://fbzvqnfnjxtxitksihov.supabase.co'

export const supabase = createClient(supabaseUrl, supabaseKey)