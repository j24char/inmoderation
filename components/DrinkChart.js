import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase'; 
import { BarChart } from 'react-native-chart-kit';

// Get the width of the device screen to make the chart responsive
const screenWidth = Dimensions.get('window').width;

export const DrinkChart = ({ refreshTrigger }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [refreshTrigger]);

  //------------------------------------------------------------------------------------------
  // Function: fetchChartData
  // Description:  Retrieves data for the last 30 days
  const fetchChartData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // --- SUPABASE DATA FETCH ---
      const { data, error } = await supabase
        .from("drinks")
        .select("drink_count, drink_date")
        .eq("user_id", user.id)
        .gte("drink_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("drink_date", { ascending: true });
      if (error) throw error;
      
      const normalizedData = data.map(d => ({
          ...d,
          // This safely extracts only the date part (YYYY-MM-DD) from the database timestamp string
          drink_date: d.drink_date ? d.drink_date.slice(0, 10) : ''
      }));
      // --- DATA PROCESSING ---
      const allDates = [];
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const dayTotal = normalizedData
          ?.filter(d => d.drink_date === dateStr)
          .reduce((sum, d) => sum + d.drink_count, 0) || 0;

        allDates.push({
          // Use a shorter format for mobile X-axis ticks (e.g., '10/22')
          date: date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
          drinks: dayTotal,
        });
      }
      //console.log("allDates: ", allDates);
      setChartData(allDates);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9c31ff" />
        <Text style={styles.loadingText}>Loading chart...</Text>
      </View>
    );
  }

  // --- Chart Data Formatting for react-native-chart-kit ---
  const chartKitData = {
    // Labels array takes every 7th day for cleaner display
    labels: chartData
      .filter((_, index) => index % 7 === 0)
      .map(item => item.date),
    // Data array contains all 31 day totals
    datasets: [
      {
        data: chartData.map(item => item.drinks),
      },
    ],
  };
  
  // Find the maximum number of drinks to determine the Y-axis scale
  const maxDrinks = Math.max(...chartKitData.datasets[0].data);
  const yAxisMax = maxDrinks > 0 ? maxDrinks : 5; // Use maxDrinks as scale base (minimum 5)
  // Determine number of horizontal grid lines (segments). Use one per integer up to a reasonable cap.
  const segments = Math.min(Math.max(1, Math.ceil(yAxisMax)), 10);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Last 30 Days</Text>
        <Text style={styles.cardDescription}>Your daily drink consumption</Text>
      </View>
      
      {chartKitData.datasets[0].data.length > 0 ? (
        <BarChart
          style={styles.chart}
          data={chartKitData}
          width={screenWidth - 32} // Subtract padding from screen width
          height={280}
          yAxisSuffix=" " // Add space after the number
          yAxisLabel=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(156, 49, 255, ${opacity})`, // Primary color
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            fillShadowGradientOpacity: 0.5,
            fillShadowGradient: '#9c31ff',
            // Bar background color
            barPercentage: 0.8,
            // Style background (grid) lines so horizontal lines are visible
            propsForBackgroundLines: {
              stroke: '#e6e6e6',
              strokeWidth: 1,
            },
          }}
          // Set a vertical interval for the X-axis labels to prevent overlap
          xLabelsOffset={-10}
          fromZero={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          segments={segments} // Number of horizontal grid lines (attempt one per integer)
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No drink data available for the last 30 days.</Text>
        </View>
      )}
    </View>
  );
};

export default DrinkChart;

// --- Stylesheet for React Native UI ---
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  chart: {
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  noDataContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    textAlign: 'center',
  },
});