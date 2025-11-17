import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen({navigation}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  //------------------------------------------------------------------------------------------
  // Function: useLayoutEffect
  // Description:  Used to add navigation to return to home screen rather than previous screen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          }
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#36ada7" />
          <Text style={{ color: '#36ada7', fontSize: 16 }}>Home</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  //------------------------------------------------------------------------------------------
  // Function: fetchHistory
  // Description:  Gets all the user's stored interaction history data
  const fetchHistory = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('interaction_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setHistory(data);
  };

  //------------------------------------------------------------------------------------------
  // Function: renderItem
  // Description:  Displays one (indexed by item) of user's interaction history data entry
  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.drugs}>{item.drug1} + {item.drug2}</Text>
      <Text style={styles.result}>Risk: {item.result}</Text>
      <Text style={styles.desc}>{item.description}</Text>
    </View>
  );

  //------------------------------------------------------------------------------------------
  // Function: handleClearData
  // Description:  Clears all user's interaction history data
  const handleClearData = async () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all your data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Get the authenticated user correctly
              const { data, error: userError } = await supabase.auth.getUser();
              if (userError || !data?.user) throw new Error('No authenticated user found');

              const userId = data.user.id;
              
              // Delete only this user’s records
              const { error } = await supabase
                .from('interaction_history') // <-- replace with your actual table
                .delete()
                .eq('user_id', userId);

              if (error) throw error;

              Alert.alert('Success', 'Your data has been cleared.');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to clear data.');
            } finally {
              fetchHistory();
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  //------------------------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interaction History</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      <View style={styles.buttonWrapper}>
        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleClearData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Clearing...' : 'Clear History'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e0f2f1',
  },
  title: {
    fontSize: 22,
    marginBottom: 10,
    color: '#45474c',
  },
  item: {
    backgroundColor: '#ffffff',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  drugs: { fontWeight: 'bold' },
  result: { color: '#00796b' },
  desc: { color: '#555' },
  buttonWrapper: {
    marginTop: 30,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#b71c1c',  // red
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
  buttonPressed: {
    opacity: 0.7,
  },
});
