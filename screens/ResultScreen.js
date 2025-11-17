import { FlatList, View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../supabase';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function ResultScreen({ route, navigation }) {
  const { results: initialResults = [], drug1, drug2 } = route.params || {};
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false); // no need to start as true since data is passed

  console.log('Route params:', route.params);
  console.log('Initial results length:', initialResults?.length);

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>No interactions found.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading results...</Text>
      </View>
    );
  }

  if (!Array.isArray(results) || results.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Error loading data or no matches found.</Text>
      </View>
    );
  }

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
  // Function: saveResult
  // Description:  Inserts a new record into database, then gets all records for user
  //   by most recent data, and deletes any records past the threshold.
  const saveResult = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error getting user:', userError);
        return;
      }

      // Step 1: Insert new record
      const { error: insertError } = await supabase.from('interaction_history').insert([
        {
          user_id: user.id,
          drug1,
          drug2,
          result: results.risk,
          description: results.description,
          created_at: new Date(), // optional: ensure timestamps for ordering
        },
      ]);

      if (insertError) {
        console.error('Insert error:', insertError);
        return;
      }

      // Step 2: Fetch all records (newest first)
      const { data: records, error: fetchError } = await supabase
        .from('interaction_history')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
      }

      // Step 3: Delete anything beyond the 10 most recent
      if (records.length > 3) {
        const idsToDelete = records.slice(3).map((r) => r.id);

        const { error: deleteError } = await supabase
          .from('interaction_history')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Prune error:', deleteError);
        }
      }

      // Step 4: Navigate to History screen
      navigation.navigate('History');
    } catch (error) {
      console.error('Unexpected error in saveResult:', error);
    }
  };

  //------------------------------------------------------------------------------------------
      
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interaction Result</Text>
      <Text style={styles.text}>Drugs: {drug1} + {drug2}</Text>

      {Array.isArray(results) ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.resultCard}>
                <Text style={styles.title}>{item.drug} + {item.food}</Text>
                <Text style={styles.text}>Risk: {item.result}</Text>
                <Text style={styles.text}>Details: {item.description}</Text>
              </View>
            )}
          />

        ) : (
          <Text style={styles.text}>No results found.</Text>
        )
      ) : (
        <Text style={styles.text}>Error loading data.</Text>
      )}

      <View style={{ marginTop: 20 }} />
      
      <Pressable style={styles.button} onPress={saveResult}>
        <Text style={styles.buttonText}>Save Result</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: '#00695c',
  },
  text: {
    fontSize: 16,
    marginVertical: 4,
  },
  button: {
    backgroundColor: '#36ada7',  // soft desaturated blue
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
  resultCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
  listContainer: {
    paddingBottom: 150,
    paddingHorizontal: 8,
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
