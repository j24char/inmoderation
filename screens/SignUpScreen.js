import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState('');
  const [isOfAge, setIsOfAge] = useState(false);

  const logoSource = Platform.OS === 'web' ? { uri: '/icon.png' } : require('../assets/icon.png');

  //------------------------------------------------------------------------------------------
  // Function: signUp
  // Description:  Attempts to create new user when all fields filled with unique info
  const signUp = async () => {
    if (!isOfAge) {
      Alert.alert(
        'Age Requirement',
        'You must be of legal drinking age to use this app.'
      );
      return;
    }
    if (!email || !password || !username) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      // Check if username (display_name in Supabase) is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles') // or your user-related table
        .select('id')
        .eq('display_name', username)
        .single();
        

      if (existingUser) {
        Alert.alert('Username taken', 'Please choose a different username.');
        setLoading(false);
        return;
      }
      else {
        console.log("User not found");
      }

      if (checkError && checkError.code !== 'PGRST116') {
        // ignore "no rows found" error
        throw checkError;
      }

      // Create the user with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        Alert.alert('Signup failed', signUpError.message);
        setLoading(false);
        return;
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        Alert.alert('Error', 'Could not get user ID after signup.');
        setLoading(false);
        return;
      }
      else {
        console.log("userId: ", userId);
      }

      // Insert display_name into "profiles" (or your equivalent user table)
      // const { error: insertError } = await supabase
      //   .from('profiles')
      //   .insert([{ id: userId, username }]); // ensure 'id' is linked to auth user id
      // const { error: insertError } = await supabase
      //   .from('profiles')
      //   .update({ display_name: username })
      //   .eq('id', userId);
      
      const { error: insertError } = await supabase
      .from('profiles')
      .update({
        display_name: username,
        age_confirmed: true, // NEW FIELD
      })
      .eq('id', userId);

      if (insertError) throw insertError;


      // Success — prompt for email verification
      Alert.alert('Success!', 'Check your email for verification.');
      // Navigate back to login screen since Supabase requires email verification before login
      navigation.navigate('Login');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  //------------------------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <Image source={logoSource} style={styles.image} />
            
      <Text>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
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
      <Pressable
        style={styles.ageRow}
        onPress={() => setIsOfAge(prev => !prev)}
      >
        <View style={[styles.checkbox, isOfAge && styles.checkboxChecked]}>
          {isOfAge && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <Text style={styles.ageText}>
          I confirm that I am at least 21 years old and legally permitted to use this app.
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.button,
          !isOfAge && styles.buttonDisabled
        ]}
        onPress={signUp}
        disabled={!isOfAge}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>

      <View style={{ marginTop: 10 }} />
      
      
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
    backgroundColor: '#9c31ff',  
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
    marginVertical: 1,
    marginBottom: 10,
    maxWidth: 300,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#9c31ff',
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#9c31ff',
  },

  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },

  ageText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});
