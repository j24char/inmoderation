import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import { checkInteractions } from '../utils/checkInteraction.js';

export default function HomeScreen({ navigation }) {
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [userIdShort, setUserIdShort] = useState('');
  const [username, setUsername] = useState('');
  const [results, setResults] = useState('');

  const mockCheckInteraction = async () => {
    if (!drug1.trim() || !drug2.trim()) {
      Alert.alert('Missing Input', 'Please enter values for both fields before continuing.');
      return; // stop navigation
    }

    // Search data for interactions
    console.log("Checking data...");
    const found = await checkInteractions(drug1);
    setResults(found);
    console.log(found);
    console.log('Found results type:', typeof found);
    console.log('Found results:', found);

    navigation.navigate('Result', { drug1, drug2, results: found });

  };
    // Mock delay and fake result
    // const result = await new Promise((resolve) =>
    //   setTimeout(
    //     () =>
    //       resolve({
    //         risk: 'Moderate',
    //         description: `Combining ${drug1} and ${drug2} may increase drowsiness.`,
    //       }),
    //     800
    //   )
    // );
    // navigation.navigate('Result', { drug1, drug2, found });
  //};

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const logoSource = Platform.OS === 'web' ? { uri: '/adaptive-icon.png' } : require('../assets/adaptive-icon.png');

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData?.user;
        
        if (user?.id) {
          // Fetch 'display_name' from 'profiles' table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) throw profileError;
          
          setUsername(profile?.display_name || 'User');
        }
      } catch (error) {
        console.error('Error fetching username:', error);
        setUsername('User');
      }
    };

    fetchUsername();
  }, []);

  //------------------------------------------------------------------------------------------
  // Function: useLayoutEffect
  // Description:  Used to add logo and username to navigation bar on home
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => (
        <Image
          source={logoSource}
          style={{ width: 40, height: 40, marginLeft: 16 }}
          resizeMode="contain"
        />
      ),
      headerRight: () => (
        <Text style={{ marginRight: 16, fontWeight: 'bold', color: '#9c31ff' }}>
          {username ? `@${username}` : ''}
        </Text>
      ),
    });
  }, [navigation, username]);

  //------------------------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check Interactions</Text>
      <TextInput
        style={styles.input}
        placeholder="First Drug"
        value={drug1}
        onChangeText={setDrug1}
      />
      <Ionicons name="add-circle-outline" size={32} color="#9c31ff" style={styles.icon} />
      <TextInput
        style={[styles.input, { marginBottom: 40 }]}
        placeholder="Second Drug"
        value={drug2}
        onChangeText={setDrug2}
      />

      <Pressable 
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]} 
        onPress={mockCheckInteraction}
        >
        <Text style={styles.buttonText}>Check for Interactions</Text>
      </Pressable>    
      
      <View style={{ marginTop: 10 }} />
      <Pressable style={styles.button} onPress={() => navigation.navigate('History')}>
        <Text style={styles.buttonText}>View History</Text>
      </Pressable>
        
      {/* <View style={{ marginTop: 10 }} />
      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable> */}
      
    </View>
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
  title: {
    fontSize: 22,
    marginBottom: 20,
    marginTop: 20,
    color: '#45474C',
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#9c31ff',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    maxWidth: 300,
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
  signOutButton: {
    backgroundColor: '#595959ff',  // red
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
  signOutButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.7,
  }
});
