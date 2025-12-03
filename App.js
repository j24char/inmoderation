import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabase';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import SignUpScreen from './screens/SignUpScreen';
import ProfileScreen from './screens/ProfileScreen';
import StatsScreen from './screens/StatsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { getSavedSession, saveSession, clearSession } from './utils/authStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#9c31ff',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'History') iconName = 'time-outline';
          else if (route.name === 'Stats') iconName = 'stats-chart-outline';
          else if (route.name === 'Profile') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

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
            {/* Main tab navigator lives inside the stack so we can push screens like Result */}
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            
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
