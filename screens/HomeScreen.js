import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
    //const found = await checkInteractions(drug1);
    const found = null;
    setResults(found);
    console.log(found);
    console.log('Found results type:', typeof found);
    console.log('Found results:', found);

    navigation.navigate('Result', { drug1, drug2, results: found });

  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // get the logo depending on the current platform
  const logoSource = Platform.OS === 'web' ? { uri: '/adaptive-icon.png' } : require('../assets/adaptive-icon.png');

  const mockCardData = [
  {
    id: '1',
    date: '2025-11-15',
    quantity: 3,
    description: 'Whiskey Coke',
  },
  {
    id: '2',
    date: '2025-11-16',
    quantity: 2,
    description: 'Gin & Tonic',
  },
  {
    id: '3',
    date: '2025-11-16',
    quantity: 1,
    description: 'Pinot grigio',
  },
  {
    id: '4',
    date: '2025-11-17',
    quantity: 4,
    description: 'Hazy IPA',
  },
];

  //------------------------------------------------------------------------------------------
  // Function: useEffect
  // Description:  Used to get the username on load
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

  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <Text>{item.title}</Text>
      <Text>{item.description}</Text>
    </View>
  );

  //------------------------------------------------------------------------------------------
  return (
    
    <FlatList
      data={mockCardData}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderCard}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={styles.topContainer}>
          <Text style={styles.title}>Header / Stats / Info</Text>
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
          
          <View style={{ marginTop: 100 }} />
          <Pressable style={styles.button} onPress={() => navigation.navigate('History')}>
            <Text style={styles.buttonText}>View History</Text>
          </Pressable>
            
          <View style={{ marginTop: 100 }} />
          <Pressable style={styles.button} onPress={() => navigation.navigate('History')}>
            <Text style={styles.buttonText}>View History</Text>
          </Pressable>
          <View style={{ marginTop: 100 }} />
          <Pressable style={styles.button} onPress={() => navigation.navigate('History')}>
            <Text style={styles.buttonText}>View History</Text>
          </Pressable>
          <View style={{ marginTop: 100 }} />
          <Pressable style={styles.button} onPress={() => navigation.navigate('History')}>
            <Text style={styles.buttonText}>View History</Text>
          </Pressable>
          {/* <View style={{ marginTop: 10 }} />
          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </Pressable> */}
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
      // <View style={styles.container}>
      //   {/* <Text style={styles.title}>Check Interactions</Text> */}
        
      //   {/* Bottom list of cards */}
      //   <View style={styles.cardList}>
      //     {data.map((item, index) => (
      //       <View key={index} style={styles.card}>
      //         <Text>{item.title}</Text>
      //         <Text>{item.description}</Text>
      //       </View>
      //     ))}
      //   </View>
      // </View>
    
    
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
  scrollContainer: {
    padding: 16,
    // Makes the scroll content stretch full width
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    marginTop: 20,
    color: '#45474C',
  },
  topContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
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
  },
  topContainer: {
    marginBottom: 16,
    // Any styling for your top container
  },
  cardList: {
    // Optional spacing between cards
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
});
