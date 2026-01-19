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
          <Text style={styles.title}>BET HEDGER</Text>
          <Text style={styles.subtitle}>Calculate your hedge</Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'calculator' && styles.modeButtonActive]}
            onPress={() => { setMode('calculator'); setResult(null); setManualResult(null); }}
          >
            <Text style={[styles.modeButtonText, mode === 'calculator' && styles.modeButtonTextActive]}>
              CALCULATE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            onPress={() => { setMode('manual'); setResult(null); setManualResult(null); }}
          >
            <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
              MANUAL
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ORIGINAL BET</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>STAKE ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={originalStake}
              onChangeText={setOriginalStake}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ODDS (AMERICAN)</Text>
            <TextInput
              style={styles.input}
              placeholder="+150 or -110"
              placeholderTextColor="#555"
              keyboardType="numbers-and-punctuation"
              value={originalOdds}
              onChangeText={setOriginalOdds}
            />
          </View>

          <View style={styles.freeBetContainer}>
            <View style={styles.freeBetTextContainer}>
              <Text style={styles.freeBetLabel}>FREE BET</Text>
              <Text style={styles.freeBetDescription}>
                Original stake is bonus money
              </Text>
            </View>
            <Switch
              value={isFreeBet}
              onValueChange={setIsFreeBet}
              trackColor={{ false: '#333', true: '#2E7D32' }}
              thumbColor={isFreeBet ? '#4CAF50' : '#666'}
              ios_backgroundColor="#333"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>HEDGE BET</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>HEDGE ODDS (AMERICAN)</Text>
            <TextInput
              style={styles.input}
              placeholder="-120 or +100"
              placeholderTextColor="#555"
              keyboardType="numbers-and-punctuation"
              value={hedgeOdds}
              onChangeText={setHedgeOdds}
            />
          </View>

          {mode === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>HEDGE STAKE ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                placeholderTextColor="#555"
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
            activeOpacity={0.7}
          >
            <Text style={styles.calculateButtonText}>
              {mode === 'calculator' ? 'CALCULATE' : 'CALCULATE'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>CLEAR</Text>
          </TouchableOpacity>
        </View>

        {result && mode === 'calculator' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>RESULTS</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Hedge Amount</Text>
              <Text style={styles.resultValueGold}>${result.hedgeAmount}</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>If Original Wins</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(result.profitIfOriginalWins) >= 0 ? styles.profit : styles.loss
              ]}>
                ${result.profitIfOriginalWins}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>If Hedge Wins</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(result.profitIfHedgeWins) >= 0 ? styles.profit : styles.loss
              ]}>
                ${result.profitIfHedgeWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.guaranteedContainer}>
              <Text style={styles.guaranteedLabel}>GUARANTEED PROFIT</Text>
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
            <Text style={styles.resultTitle}>RESULTS</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Staked</Text>
              <Text style={styles.resultValueGold}>${manualResult.totalStaked}</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.scenarioTitle}>IF ORIGINAL WINS ({originalOdds})</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>You Receive</Text>
              <Text style={styles.resultValue}>${manualResult.originalPayout}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(manualResult.profitIfOriginalWins) >= 0 ? styles.profit : styles.loss
              ]}>
                {parseFloat(manualResult.profitIfOriginalWins) >= 0 ? '+' : ''}${manualResult.profitIfOriginalWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.scenarioTitle}>IF HEDGE WINS ({hedgeOdds})</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>You Receive</Text>
              <Text style={styles.resultValue}>${manualResult.hedgePayout}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit</Text>
              <Text style={[
                styles.resultValue,
                parseFloat(manualResult.profitIfHedgeWins) >= 0 ? styles.profit : styles.loss
              ]}>
                {parseFloat(manualResult.profitIfHedgeWins) >= 0 ? '+' : ''}${manualResult.profitIfHedgeWins}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryContainer}>
              <Text style={[
                styles.summaryText,
                parseFloat(manualResult.profitIfOriginalWins) >= 0 && parseFloat(manualResult.profitIfHedgeWins) >= 0
                  ? styles.profit
                  : parseFloat(manualResult.profitIfOriginalWins) < 0 && parseFloat(manualResult.profitIfHedgeWins) < 0
                    ? styles.loss
                    : styles.warning
              ]}>
                {parseFloat(manualResult.profitIfOriginalWins) >= 0 && parseFloat(manualResult.profitIfHedgeWins) >= 0
                  ? 'GUARANTEED PROFIT'
                  : parseFloat(manualResult.profitIfOriginalWins) < 0 && parseFloat(manualResult.profitIfHedgeWins) < 0
                    ? 'LOSS EITHER WAY'
                    : 'OUTCOME DEPENDENT'}
              </Text>
            </View>
          </View>
        )}

        {result === null && manualResult === null && originalStake !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Enter valid values for all fields
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>HOW IT WORKS</Text>
          <Text style={styles.infoText}>
            {mode === 'calculator' 
              ? 'Enter your original bet stake and American odds, then enter the opposing side\'s odds. Toggle Free Bet if using bonus money.'
              : 'Enter both bets to see profit/loss for each outcome. Toggle Free Bet if original stake is bonus money.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 56,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 4,
    padding: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 3,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 1,
  },
  modeButtonTextActive: {
    color: '#000',
  },
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    letterSpacing: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    fontWeight: '500',
  },
  freeBetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  freeBetTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  freeBetLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  freeBetDescription: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  calculateButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 3,
    padding: 16,
    alignItems: 'center',
  },
  calculateButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 3,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  clearButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  resultCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 3,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 13,
    color: '#888',
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  resultValueGold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4AF37',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 12,
  },
  guaranteedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#222',
  },
  guaranteedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
  },
  guaranteedValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  profit: {
    color: '#4CAF50',
  },
  loss: {
    color: '#E53935',
  },
  warning: {
    color: '#D4AF37',
  },
  summaryContainer: {
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    marginTop: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scenarioTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4AF37',
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 1,
  },
  errorCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 3,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  errorText: {
    color: '#E53935',
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    letterSpacing: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 18,
  },
});
