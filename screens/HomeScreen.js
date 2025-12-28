import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Alert, Button, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, TouchableOpacity, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { Ionicons } from '@expo/vector-icons';
import { DrinkChart } from '../components/DrinkChart.js';
import { processDailyTotals, averageLastNDays } from '../utils/dataUtils';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function HomeScreen({ navigation }) {
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [userIdShort, setUserIdShort] = useState('');
  const [username, setUsername] = useState('');
  const [results, setResults] = useState('');

  const [cards, setCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshChartTrigger, setRefreshChartTrigger] = useState(0);

  // get the logo depending on the current platform
  const logoSource = Platform.OS === 'web' ? { uri: '/adaptive-icon.png' } : require('../assets/adaptive-icon.png');

  // Open modal with selected card
  const handleCardPress = (card) => {
    setSelectedCard(card);
    setModalVisible(true);
  };

  // Calculate stats from cards
  const stats = React.useMemo(() => {
    const processed = processDailyTotals(cards || []);
    const total = processed.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const avg30 = averageLastNDays(processed, 30);
    return { total, avg30 };
  }, [cards]);

  //------------------------------------------------------------------------------------------
  // Function: toLocalDateString
  // Description:  Local helper to convert Date object to YYYY-MM-DD string
  const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  //------------------------------------------------------------------------------------------
  // Function: handleSave
  // Description:  Updates the database 
  const handleSave = async () => {
    if (!selectedCard) return;

    // 1. Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        Alert.alert('Error', 'You must be logged in to save drinks.');
        return;
    }

    // Prepare data for Supabase
    const drinkData = {
        user_id: user.id,
        drink_count: Number(selectedCard.quantity),
        //drink_date: selectedCard.date.slice(0, 10), // Ensure format is YYYY-MM-DD
        drink_date: selectedCard.date,
        notes: selectedCard.description,
    };

    setModalVisible(false); // Close modal right away

    try {
        // Check if this is an existing card (has a database ID) or a new one
        const isExisting = cards.some(c => c.id === selectedCard.id && c.id.length < 15); // Simple check for database ID vs temporary Date.now() ID

        if (isExisting) {
            // UPDATE existing record
            const { error } = await supabase
                .from('drinks')
                .update(drinkData)
                .eq('id', selectedCard.id);

            if (error) throw error;
            Alert.alert('Success', 'Drink record updated!');
        } else {
            // INSERT new record
            // The table must have a default ID (like a UUID) for this to work
            const { error } = await supabase
                .from('drinks')
                .insert([drinkData]);

            if (error) throw error;
            Alert.alert('Success', 'New drink logged!');
        }
        setRefreshChartTrigger(prev => prev + 1);
        
        // After successful save, refresh the list from the database
        await fetchDrinks();

    } catch (error) {
        console.error('Database Operation Error:', error);
        Alert.alert('Error', `Failed to save drink: ${error.message}`);
    } finally {
        setSelectedCard(null);
    }
  };

  //------------------------------------------------------------------------------------------
  // Function: signOut
  // Description:  Signs the user out from authenticated database connection
  const signOut = async () => {
    await supabase.auth.signOut();
    // clear saved session from secure store when signing out
    try {
      const { clearSession } = await import('../utils/authStore');
      await clearSession();
    } catch (e) {
      console.warn('Failed to clear session on sign out', e);
    }
  };

  //------------------------------------------------------------------------------------------
  // Function: addDrink
  // Description:  Add drink and update database
  const addDrink = async () => {
    const newCard = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-CA'),
      quantity: 1,
      description: '',
    };
    setSelectedCard(newCard);
    setModalVisible(true);
  }

  //------------------------------------------------------------------------------------------
  // Function: fetchDrinks
  // Description:  Fetches the active user's drink data from Supabase and updates state
  const fetchDrinks = async () => {
      // Get the current active user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          console.warn("No active user found. Cannot fetch drinks.");
          return;
      }

      try {
          const { data, error } = await supabase
              .from("drinks")
              .select("id, drink_count, drink_date, notes")
              .eq("user_id", user.id)
              .order("drink_date", { ascending: false }); // Order from newest to oldest

          if (error) throw error;

          // Map the Supabase data structure to the component's expected 'card' structure
          const mappedData = data.map(item => ({
              // Use the database row ID if available, otherwise fallback to generating one
              id: item.id.toString(),
              // Map 'drink_date' to 'date'
              date: item.drink_date,
              // Map 'drink_count' to 'quantity'
              quantity: item.drink_count,
              // Map 'notes' to 'description'. Use an empty string if notes is null
              description: item.notes || '',
          }));

          setCards(mappedData);

      } catch (error) {
          console.error('Error fetching drinks:', error);
          // Optionally show an alert to the user
          // Alert.alert('Data Error', 'Failed to load drink history.');
      }
  };

  //------------------------------------------------------------------------------------------
  // Function: useEffect - Fetch Drinks
  // Description:  Call fetchDrinks on load and whenever a new drink is logged (if you add a refresh trigger)
  useEffect(() => {
      fetchDrinks();
  }, []); // Empty dependency array means it runs once on mount.

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
            <Pressable 
                // Ensure there is a username before allowing navigation
                onPress={() => username ? navigation.navigate('Profile') : null} 
                style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1, // Simple press feedback
                    marginRight: 16,
                    padding: 4, // Make the touch area slightly larger
                })}
            >
                <Text style={{ fontWeight: 'bold', color: '#9c31ff' }}>
                    {username ? `@${username}` : ''}
                </Text>
            </Pressable>
        ),
    });
  }, [navigation, username, logoSource]);

  //------------------------------------------------------------------------------------------
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={cards}
        ListHeaderComponent={
          <View style={styles.topContainer}>
            <DrinkChart refreshTrigger={refreshChartTrigger} /> 
            <View style={styles.statRow}>
              <View style={[styles.statCard, { marginRight: 8 }]}>
                <Text style={styles.statTitle}>Total Drinks</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
              <View style={[styles.statCard, { marginLeft: 8 }]}>
                <Text style={styles.statTitle}>Avg Drinks/Day Last 30 days</Text>
                <Text style={styles.statValue}>{Number.isFinite(stats.avg30) ? stats.avg30.toFixed(1) : '0.0'}</Text>
              </View>
            </View>
            {/* <Text style={styles.title}>Header / Stats / Info</Text> */}
            {/* <TextInput
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
            /> */}
              
            <View style={{ marginTop: 10 }} />
            <Pressable style={styles.button} onPress={addDrink}>
              <Text style={styles.buttonText}>Add Drink</Text>
            </Pressable>
          </View>
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleCardPress(item)}
          >
            <Text style={styles.cardDate}>{item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString() : ''}</Text>
            <Text>Quantity: {item.quantity}</Text>
            <Text>Description: {item.description}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={styles.topContainer}>
            <Pressable 
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]} 
                onPress={() => navigation.navigate('History')}>
                <Text style={styles.buttonText}>View Complete History</Text>
              </Pressable>   
          </View>
        }
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoid}
            >
              <View style={[styles.modalContent, showDatePicker && styles.modalContentWithPicker]}>
                <Text style={styles.modalTitle}>Edit Record</Text>

                    <Text style={{ marginBottom: 6 }}>Date:</Text>
                    <Pressable
                      style={[styles.input, { justifyContent: 'center' }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      {/* <Text>{selectedCard?.date ? new Date(selectedCard.date).toLocaleDateString() : 'Select date'}</Text> */}
                      <Text>{selectedCard?.date ? selectedCard.date : 'Select date'}</Text>
                    </Pressable>
                    {showDatePicker && (
                      <View style={styles.pickerWrapper}>
                        <DateTimePicker
                          //value={selectedCard?.date ? new Date(selectedCard.date) : new Date()}
                          value={
                            selectedCard?.date
                              ? new Date(selectedCard.date + 'T00:00:00')
                              : new Date()
                          }
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                          onChange={(event, picked) => {
                            // On Android, event.type === 'dismissed' when canceled
                            if (event?.type === 'dismissed') {
                              setShowDatePicker(false);
                              return;
                            }
                            const chosen = picked || new Date();

                            // Rebuild as LOCAL calendar date (this removes UTC shift)
                            const localDate = new Date(
                              chosen.getFullYear(),
                              chosen.getMonth(),
                              chosen.getDate()
                            );

                            const yyyyMMdd = localDate.toLocaleDateString('en-CA');

                            setSelectedCard({
                              ...selectedCard,
                              date: yyyyMMdd,
                            });

                            setShowDatePicker(false);
                          }}
                          {...(Platform.OS === 'ios' ? { textColor: '#000' } : {})}
                        />
                      </View>
                    )}

                <Text>Quantity:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={selectedCard?.quantity !== undefined ? String(selectedCard.quantity) : ''}
                  onChangeText={(text) =>
                    setSelectedCard({ ...selectedCard, quantity: parseInt(text) || 0 })
                  }
                />

                <Text>Description:</Text>
                <TextInput
                  style={styles.input}
                  value={selectedCard?.description || ''}
                  onChangeText={(text) =>
                    setSelectedCard({ ...selectedCard, description: text })
                  }
                />

                <View style={styles.modalButtons}>
                  <Button title="Save" onPress={handleSave} />
                  <Button title="Cancel" onPress={() => { setModalVisible(false); setSelectedCard(null); }} />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    alignItems: 'center',
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
    elevation: 3,
    // Keep cards inset from screen edges
    marginHorizontal: 16,
    alignSelf: 'center',
    width: '92%',
  },
  cardDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboardAvoid: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWithPicker: {
    backgroundColor: '#f0f4f8',
  },
  pickerWrapper: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    // ensure picker sits visually separate
    marginTop: 8,
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 220,
  },
  statTitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
});
