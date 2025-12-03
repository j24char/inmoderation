import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { saveSession } from '../utils/authStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const logoSource = Platform.OS === 'web' ? { uri: '/icon.png' } : require('../assets/icon.png');

  //------------------------------------------------------------------------------------------
  // Function: signIn
  // Description:  Uses email/password to sign in
  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
    // Persist session securely so users stay logged in across app restarts
    if (data?.session) {
      try {
        await saveSession(data.session);
      } catch (e) {
        console.warn('Failed to save session after sign in', e);
      }
    }
  };

  //------------------------------------------------------------------------------------------
  // Function: handleForgotPassword
  // Description:  Sends the password reset email to the input email
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Please enter your email address first.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://inmoderation.vercel.app/reset-password', // placeholder redirect URL
    });

    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'Password reset instructions have been sent.');
  };

  //------------------------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <Image source={logoSource} style={styles.image} />
      {/* <Text style={styles.title}>InModeration</Text> */}
      <Text>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Text>Password</Text>
      <TextInput
        style={[styles.input, { marginBottom: 20 }]}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <Pressable style={styles.button} onPress={signIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
      <Pressable onPress={handleForgotPassword}>
        <Text style={{ marginTop: 12, color: '#9c31ff', textAlign: 'center' }}>
          Forgot your password?
        </Text>
      </Pressable>
      <View style={{ marginTop: 10 }} />

      <Pressable style={styles.button} onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'top',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  button: {
    backgroundColor: '#9c31ff',  // soft desaturated blue
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '80%',
    maxWidth: 300,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    color: '#9c31ff',
  },
  image: {
    width: 180,
    height: 180,
    marginBottom: 30,
    borderRadius: 90, // makes it circular if image is square
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#9c31ff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 2,
    maxWidth: 300,
  },
});
