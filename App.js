import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabase';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import SignUpScreen from './screens/SignUpScreen';
import ProfileScreen from './screens/ProfileScreen';
import { getSavedSession, saveSession, clearSession } from './utils/authStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Try to restore session from secure store first
    (async () => {
      const stored = await getSavedSession();
      if (stored && mounted) {
        try {
          // Tell supabase client about the existing minimal session (tokens)
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: stored.access_token,
            refresh_token: stored.refresh_token,
          });
          if (error) {
            console.warn('Failed to set session from secure store', error);
            // fallback to Supabase internal session
            const { data: { session: fallback } } = await supabase.auth.getSession();
            if (mounted) setSession(fallback);
          } else {
            if (mounted) setSession(session);
          }
        } catch (e) {
          console.warn('Failed to set session from secure store', e);
        }
      } else {
        // fallback to Supabase internal session (if any)
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setSession(session);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Persist session when user signs in / token refreshes, clear when signs out
      if (session) {
        saveSession(session);
      } else {
        clearSession();
      }
      setSession(session);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="History" component={HistoryScreen} 
              options={{
                headerBackTitle: 'Home', // text shown on back button
                headerBackTitleStyle: {
                  color: '#9c31ff', // app main color
                  fontWeight: '500', // optional
                },
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />  
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
