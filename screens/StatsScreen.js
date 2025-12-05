import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { processDailyTotals, averageLastNDays } from '../utils/dataUtils';
import { supabase } from '../supabase';

export default function StatsScreen() {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchDrinks = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userData?.user;
        if (!user?.id) {
          if (mounted) {
            setDrinks([]);
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchErr } = await supabase
            .from("drinks")
            .select("id, drink_count, drink_date, notes")
            .eq("user_id", user.id)
            .order("drink_date", { ascending: false }); // Order from newest to oldest

        if (fetchErr) throw fetchErr;

        if (mounted) setDrinks(data || []);
      } catch (err) {
        console.error('Failed to load drinks for stats:', err?.message ?? err);
        if (mounted) setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDrinks();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#9c31ff" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={{ color: 'red' }}>{error}</Text>
      </SafeAreaView>
    );
  }

  // Map Supabase rows (which use `drink_count` / `drink_date`) into the
  // shape expected by `processDailyTotals` ({ date, quantity }). This keeps
  // the DB naming separate from the UI/data utilities.
  const mapped = (drinks || []).map((item) => ({
    ...item,
    date: item.drink_date ?? item.date ?? item.datetime ?? item.created_at,
    quantity: Number(item.drink_count ?? item.quantity ?? item.qty ?? 0),
  }));

  const processed = processDailyTotals(mapped);
  const total = processed.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const avg30 = averageLastNDays(processed, 30);

  // Average drinks per week since the start of the data
  let avgPerWeek = 0;
  // Average per drinking day (only days with quantity > 0)
  let avgPerDrinkingDay = 0;

  if (processed.length > 0) {
    // Determine earliest date in processed (array is sorted ascending)
    const firstDateStr = processed[0].date;
    const firstDate = new Date(firstDateStr + 'T00:00:00Z');
    const ref = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSpan = Math.max(1, Math.floor((ref - firstDate) / msPerDay) + 1);
    const weeks = daysSpan / 7;
    avgPerWeek = weeks > 0 ? (total / weeks) : total;

    const drinkingDays = processed.filter((p) => Number(p.quantity) > 0).length;
    avgPerDrinkingDay = drinkingDays > 0 ? total / drinkingDays : 0;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Statistics</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Total Drinks:</Text>
        <Text style={styles.value}>{total}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>30-day Avg:</Text>
        <Text style={styles.value}>{Number.isFinite(avg30) ? avg30.toFixed(1) : '0.0'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Average / Week (since first):</Text>
        <Text style={styles.value}>{Number.isFinite(avgPerWeek) ? avgPerWeek.toFixed(1) : '0.0'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Avg per Drinking Day:</Text>
        <Text style={styles.value}>{Number.isFinite(avgPerDrinkingDay) ? avgPerDrinkingDay.toFixed(1) : '0.0'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '700',
    color: '#333',
  },
});
