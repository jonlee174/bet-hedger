import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Convert American odds to decimal odds
const americanToDecimal = (american) => {
  const odds = parseFloat(american);
  if (isNaN(odds)) return null;
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
};

// Calculate hedge amount and profits
const calculateHedge = (originalStake, originalOdds, hedgeOdds, isFreeBet) => {
  const decimalOriginal = americanToDecimal(originalOdds);
  const decimalHedge = americanToDecimal(hedgeOdds);
  
  if (!decimalOriginal || !decimalHedge || originalStake <= 0) {
    return null;
  }

  const stake = parseFloat(originalStake);
  
  if (isFreeBet) {
    // Free bet: You don't lose the stake if original bet loses
    // If original wins: profit = (decimalOriginal - 1) * stake - hedgeAmount
    // If hedge wins: profit = hedgeAmount * (decimalHedge - 1)
    // For equal profit: (decimalOriginal - 1) * stake - hedgeAmount = hedgeAmount * (decimalHedge - 1)
    // Solving: hedgeAmount = (decimalOriginal - 1) * stake / decimalHedge
    
    const hedgeAmount = ((decimalOriginal - 1) * stake) / decimalHedge;
    const profitIfOriginalWins = (decimalOriginal - 1) * stake - hedgeAmount;
    const profitIfHedgeWins = hedgeAmount * (decimalHedge - 1);
    
    return {
      hedgeAmount: hedgeAmount.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      guaranteedProfit: Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2),
    };
  } else {
    // Normal bet: You lose the stake if original bet loses
    // If original wins: profit = (decimalOriginal * stake) - stake - hedgeAmount
    // If hedge wins: profit = (hedgeAmount * decimalHedge) - hedgeAmount - stake
    // For equal profit: decimalOriginal * stake - stake - hedgeAmount = hedgeAmount * decimalHedge - hedgeAmount - stake
    // Simplifying: (decimalOriginal - 1) * stake = hedgeAmount * (decimalHedge - 1)
    // Wait, that's not right for normal bets where we want to guarantee profit
    
    // Actually for normal hedge:
    // If original wins: totalReturn = decimalOriginal * stake, profit = decimalOriginal * stake - stake - hedgeAmount
    // If hedge wins: totalReturn = decimalHedge * hedgeAmount, profit = decimalHedge * hedgeAmount - stake - hedgeAmount
    
    // Setting equal: decimalOriginal * stake - stake - hedgeAmount = decimalHedge * hedgeAmount - stake - hedgeAmount
    // decimalOriginal * stake = decimalHedge * hedgeAmount
    // hedgeAmount = (decimalOriginal * stake) / decimalHedge
    
    const hedgeAmount = (decimalOriginal * stake) / decimalHedge;
    const profitIfOriginalWins = (decimalOriginal * stake) - stake - hedgeAmount;
    const profitIfHedgeWins = (decimalHedge * hedgeAmount) - stake - hedgeAmount;
    
    return {
      hedgeAmount: hedgeAmount.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      guaranteedProfit: Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2),
    };
  }
};

// Calculate profit when both bets are manually entered
const calculateManualProfit = (originalStake, originalOdds, hedgeStake, hedgeOdds, isFreeBet) => {
  const decimalOriginal = americanToDecimal(originalOdds);
  const decimalHedge = americanToDecimal(hedgeOdds);
  
  if (!decimalOriginal || !decimalHedge || originalStake <= 0 || hedgeStake <= 0) {
    return null;
  }

  const origStake = parseFloat(originalStake);
  const hedgeAmount = parseFloat(hedgeStake);
  const totalStaked = origStake + hedgeAmount;
  
  // Calculate payouts (total cash received if that bet wins)
  const originalPayout = decimalOriginal * origStake; // Total return if original wins
  const hedgePayout = decimalHedge * hedgeAmount; // Total return if hedge wins
  
  if (isFreeBet) {
    // Free bet: original stake not at risk, only hedge stake is real money
    const realMoneyAtRisk = hedgeAmount;
    // If original wins: get payout (minus original stake since it's free), lose hedge
    const profitIfOriginalWins = (originalPayout - origStake) - hedgeAmount;
    // If hedge wins: get hedge payout, free bet loses (no real loss)
    const profitIfHedgeWins = hedgePayout - hedgeAmount;
    
    return {
      originalPayout: originalPayout.toFixed(2),
      hedgePayout: hedgePayout.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      totalStaked: realMoneyAtRisk.toFixed(2),
    };
  } else {
    // Normal bet: both stakes are real money at risk
    // If original wins: receive originalPayout, hedge loses
    const profitIfOriginalWins = originalPayout - totalStaked;
    // If hedge wins: receive hedgePayout, original loses  
    const profitIfHedgeWins = hedgePayout - totalStaked;
    
    return {
      originalPayout: originalPayout.toFixed(2),
      hedgePayout: hedgePayout.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      totalStaked: totalStaked.toFixed(2),
    };
  }
};

export default function App() {
  const [mode, setMode] = useState('calculator'); // 'calculator' or 'manual'
  const [originalStake, setOriginalStake] = useState('');
  const [originalOdds, setOriginalOdds] = useState('');
  const [hedgeOdds, setHedgeOdds] = useState('');
  const [hedgeStake, setHedgeStake] = useState('');
  const [isFreeBet, setIsFreeBet] = useState(false);
  const [result, setResult] = useState(null);
  const [manualResult, setManualResult] = useState(null);

  const handleCalculate = useCallback(() => {
    if (mode === 'calculator') {
      const calculation = calculateHedge(originalStake, originalOdds, hedgeOdds, isFreeBet);
      setResult(calculation);
      setManualResult(null);
    } else {
      const calculation = calculateManualProfit(originalStake, originalOdds, hedgeStake, hedgeOdds, isFreeBet);
      setManualResult(calculation);
      setResult(null);
    }
  }, [mode, originalStake, originalOdds, hedgeOdds, hedgeStake, isFreeBet]);

  const handleClear = useCallback(() => {
    setOriginalStake('');
    setOriginalOdds('');
    setHedgeOdds('');
    setHedgeStake('');
    setIsFreeBet(false);
    setResult(null);
    setManualResult(null);
  }, []);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Bet Hedger</Text>
          <Text style={styles.subtitle}>Calculate your perfect hedge</Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'calculator' && styles.modeButtonActive]}
            onPress={() => { setMode('calculator'); setResult(null); setManualResult(null); }}
          >
            <Text style={[styles.modeButtonText, mode === 'calculator' && styles.modeButtonTextActive]}>
              Calculate Hedge
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            onPress={() => { setMode('manual'); setResult(null); setManualResult(null); }}
          >
            <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
              Enter Both Bets
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Original Bet</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stake Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              value={originalStake}
              onChangeText={setOriginalStake}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Odds (American)</Text>
            <TextInput
              style={styles.input}
              placeholder="+150 or -110"
              placeholderTextColor="#666"
              keyboardType="numbers-and-punctuation"
              value={originalOdds}
              onChangeText={setOriginalOdds}
            />
          </View>

          <View style={styles.freeBetContainer}>
            <View style={styles.freeBetTextContainer}>
              <Text style={styles.freeBetLabel}>Free Bet / Bonus Money</Text>
              <Text style={styles.freeBetDescription}>
                Toggle if original stake is free money
              </Text>
            </View>
            <Switch
              value={isFreeBet}
              onValueChange={setIsFreeBet}
              trackColor={{ false: '#3a3a4a', true: '#4CAF50' }}
              thumbColor={isFreeBet ? '#fff' : '#888'}
              ios_backgroundColor="#3a3a4a"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hedge Bet</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hedge Odds (American)</Text>
            <TextInput
              style={styles.input}
              placeholder="-120 or +100"
              placeholderTextColor="#666"
              keyboardType="numbers-and-punctuation"
              value={hedgeOdds}
              onChangeText={setHedgeOdds}
            />
          </View>

          {mode === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hedge Stake ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                value={hedgeStake}
                onChangeText={setHedgeStake}
              />
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.calculateButton}
            onPress={handleCalculate}
            activeOpacity={0.8}
          >
            <Text style={styles.calculateButtonText}>
              {mode === 'calculator' ? 'Calculate Hedge' : 'Calculate Profit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {result && mode === 'calculator' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>📊 Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Hedge Amount:</Text>
              <Text style={styles.resultValue}>${result.hedgeAmount}</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>If Original Wins:</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(result.profitIfOriginalWins) >= 0 ? styles.profit : styles.loss
              ]}>
                ${result.profitIfOriginalWins}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>If Hedge Wins:</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(result.profitIfHedgeWins) >= 0 ? styles.profit : styles.loss
              ]}>
                ${result.profitIfHedgeWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.guaranteedContainer}>
              <Text style={styles.guaranteedLabel}>Guaranteed Profit:</Text>
              <Text style={[
                styles.guaranteedValue,
                parseFloat(result.guaranteedProfit) >= 0 ? styles.profit : styles.loss
              ]}>
                ${result.guaranteedProfit}
              </Text>
            </View>
          </View>
        )}

        {manualResult && mode === 'manual' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>📊 Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Staked:</Text>
              <Text style={styles.resultValue}>${manualResult.totalStaked}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.scenarioTitle}>If Original Bet Wins (+{originalOdds})</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>You Receive:</Text>
              <Text style={[styles.resultValue, styles.profit]}>${manualResult.originalPayout}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit:</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(manualResult.profitIfOriginalWins) >= 0 ? styles.profit : styles.loss
              ]}>
                {parseFloat(manualResult.profitIfOriginalWins) >= 0 ? '+' : ''}${manualResult.profitIfOriginalWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.scenarioTitle}>If Hedge Bet Wins ({hedgeOdds})</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>You Receive:</Text>
              <Text style={[styles.resultValue, styles.profit]}>${manualResult.hedgePayout}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit:</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(manualResult.profitIfHedgeWins) >= 0 ? styles.profit : styles.loss
              ]}>
                {parseFloat(manualResult.profitIfHedgeWins) >= 0 ? '+' : ''}${manualResult.profitIfHedgeWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {parseFloat(manualResult.profitIfOriginalWins) >= 0 && parseFloat(manualResult.profitIfHedgeWins) >= 0
                  ? '✅ Guaranteed profit either way!'
                  : parseFloat(manualResult.profitIfOriginalWins) < 0 && parseFloat(manualResult.profitIfHedgeWins) < 0
                    ? '❌ Loss either way - adjust your bets'
                    : '⚠️ Profit depends on outcome'}
              </Text>
            </View>
          </View>
        )}

        {result === null && manualResult === null && originalStake !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Please enter valid values for all fields
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 How it works</Text>
          <Text style={styles.infoText}>
            {mode === 'calculator' 
              ? '• Enter your original bet stake and American odds\n• Enter the opposing side\'s odds for hedging\n• Toggle "Free Bet" if using bonus/promo money\n• Get the optimal hedge amount for guaranteed profit'
              : '• Enter both your original bet and hedge bet details\n• See your profit/loss for each outcome\n• Toggle "Free Bet" if original stake is bonus money\n• Adjust amounts to find your ideal balance'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#252540',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a4a',
  },
  freeBetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  freeBetTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  freeBetLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  freeBetDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  calculateButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#3a3a4a',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#252540',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 16,
    color: '#aaa',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#3a3a4a',
    marginVertical: 12,
  },
  guaranteedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  guaranteedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  guaranteedValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profit: {
    color: '#4CAF50',
  },
  loss: {
    color: '#f44336',
  },
  summaryContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scenarioTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 12,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: '#3a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#252540',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
});
