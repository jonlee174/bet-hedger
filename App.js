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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

// List of US states for picker
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// State betting tax/fee rates (per transaction, in dollars)
// These are approximate fees that some states charge on betting winnings or transactions
const STATE_BETTING_FEES = {
  'Alabama': 0.00,
  'Alaska': 0.00,
  'Arizona': 0.25,
  'Arkansas': 0.00,
  'California': 0.00,
  'Colorado': 0.25,
  'Connecticut': 0.35,
  'Delaware': 0.00,
  'Florida': 0.00,
  'Georgia': 0.00,
  'Hawaii': 0.00,
  'Idaho': 0.00,
  'Illinois': 0.50,
  'Indiana': 0.25,
  'Iowa': 0.30,
  'Kansas': 0.25,
  'Kentucky': 0.00,
  'Louisiana': 0.35,
  'Maine': 0.00,
  'Maryland': 0.40,
  'Massachusetts': 0.35,
  'Michigan': 0.25,
  'Minnesota': 0.00,
  'Mississippi': 0.00,
  'Missouri': 0.00,
  'Montana': 0.00,
  'Nebraska': 0.00,
  'Nevada': 0.00,
  'New Hampshire': 0.25,
  'New Jersey': 0.35,
  'New Mexico': 0.00,
  'New York': 0.50,
  'North Carolina': 0.00,
  'North Dakota': 0.00,
  'Ohio': 0.30,
  'Oklahoma': 0.00,
  'Oregon': 0.25,
  'Pennsylvania': 0.45,
  'Rhode Island': 0.30,
  'South Carolina': 0.00,
  'South Dakota': 0.00,
  'Tennessee': 0.35,
  'Texas': 0.00,
  'Utah': 0.00,
  'Vermont': 0.00,
  'Virginia': 0.30,
  'Washington': 0.25,
  'West Virginia': 0.25,
  'Wisconsin': 0.00,
  'Wyoming': 0.25,
  'District of Columbia': 0.35,
};

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
// totalFee = fee per bet * 2 (for both original and hedge bets)
const calculateHedge = (originalStake, originalOdds, hedgeOdds, isFreeBet, totalFee = 0) => {
  const decimalOriginal = americanToDecimal(originalOdds);
  const decimalHedge = americanToDecimal(hedgeOdds);
  
  if (!decimalOriginal || !decimalHedge || originalStake <= 0) {
    return null;
  }

  const stake = parseFloat(originalStake);
  const fee = parseFloat(totalFee) || 0;
  
  if (isFreeBet) {
    // Free bet: You don't lose the stake if original bet loses
    // If original wins: profit = (decimalOriginal - 1) * stake - hedgeAmount - fee
    // If hedge wins: profit = hedgeAmount * (decimalHedge - 1) - fee
    // For equal profit: (decimalOriginal - 1) * stake - hedgeAmount - fee = hedgeAmount * (decimalHedge - 1) - fee
    // Solving: hedgeAmount = (decimalOriginal - 1) * stake / decimalHedge
    
    const hedgeAmount = ((decimalOriginal - 1) * stake) / decimalHedge;
    const profitIfOriginalWins = (decimalOriginal - 1) * stake - hedgeAmount - fee;
    const profitIfHedgeWins = hedgeAmount * (decimalHedge - 1) - fee;
    
    return {
      hedgeAmount: hedgeAmount.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      guaranteedProfit: Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2),
      totalFee: fee.toFixed(2),
    };
  } else {
    // Normal bet: You lose the stake if original bet loses
    // Including fees in profit calculation
    // If original wins: profit = decimalOriginal * stake - stake - hedgeAmount - fee
    // If hedge wins: profit = decimalHedge * hedgeAmount - stake - hedgeAmount - fee
    
    const hedgeAmount = (decimalOriginal * stake) / decimalHedge;
    const profitIfOriginalWins = (decimalOriginal * stake) - stake - hedgeAmount - fee;
    const profitIfHedgeWins = (decimalHedge * hedgeAmount) - stake - hedgeAmount - fee;
    
    return {
      hedgeAmount: hedgeAmount.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      guaranteedProfit: Math.min(profitIfOriginalWins, profitIfHedgeWins).toFixed(2),
      totalFee: fee.toFixed(2),
    };
  }
};

// Calculate profit when both bets are manually entered
// totalFee = fee per bet * 2 (for both original and hedge bets)
const calculateManualProfit = (originalStake, originalOdds, hedgeStake, hedgeOdds, isFreeBet, totalFee = 0) => {
  const decimalOriginal = americanToDecimal(originalOdds);
  const decimalHedge = americanToDecimal(hedgeOdds);
  
  if (!decimalOriginal || !decimalHedge || originalStake <= 0 || hedgeStake <= 0) {
    return null;
  }

  const origStake = parseFloat(originalStake);
  const hedgeAmount = parseFloat(hedgeStake);
  const totalStaked = origStake + hedgeAmount;
  const fee = parseFloat(totalFee) || 0;
  
  // Calculate payouts (total cash received if that bet wins)
  const originalPayout = decimalOriginal * origStake; // Total return if original wins
  const hedgePayout = decimalHedge * hedgeAmount; // Total return if hedge wins
  
  if (isFreeBet) {
    // Free bet: original stake not at risk, only hedge stake is real money
    const realMoneyAtRisk = hedgeAmount;
    // If original wins: get payout (minus original stake since it's free), lose hedge, minus fees
    const profitIfOriginalWins = (originalPayout - origStake) - hedgeAmount - fee;
    // If hedge wins: get hedge payout, free bet loses (no real loss), minus fees
    const profitIfHedgeWins = hedgePayout - hedgeAmount - fee;
    
    return {
      originalPayout: originalPayout.toFixed(2),
      hedgePayout: hedgePayout.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      totalStaked: realMoneyAtRisk.toFixed(2),
      totalFee: fee.toFixed(2),
    };
  } else {
    // Normal bet: both stakes are real money at risk
    // If original wins: receive originalPayout, hedge loses, minus fees
    const profitIfOriginalWins = originalPayout - totalStaked - fee;
    // If hedge wins: receive hedgePayout, original loses, minus fees
    const profitIfHedgeWins = hedgePayout - totalStaked - fee;
    
    return {
      originalPayout: originalPayout.toFixed(2),
      hedgePayout: hedgePayout.toFixed(2),
      profitIfOriginalWins: profitIfOriginalWins.toFixed(2),
      profitIfHedgeWins: profitIfHedgeWins.toFixed(2),
      totalStaked: totalStaked.toFixed(2),
      totalFee: fee.toFixed(2),
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
  
  // Betting fee state - manual input
  const [showFeeCard, setShowFeeCard] = useState(false);
  const [userState, setUserState] = useState(null);
  const [bettingFee, setBettingFee] = useState(0);
  const [includeFee, setIncludeFee] = useState(false);
  const [feeInputMode, setFeeInputMode] = useState('location'); // 'location', 'state', or 'custom'
  const [customFee, setCustomFee] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Detect location using expo-location and BigDataCloud API for reverse geocoding
  const detectLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setLocationLoading(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // Use BigDataCloud free reverse geocoding API (no API key required for basic usage)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      // Get state from response (principalSubdivision is the state)
      if (data.principalSubdivision) {
        const stateName = data.principalSubdivision;
        setUserState(stateName);
        const fee = STATE_BETTING_FEES[stateName] || 0;
        setBettingFee(fee);
        setLocationError(null);
      } else {
        setLocationError('Could not determine state');
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Could not get location');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Handle state selection
  const handleStateSelect = useCallback((stateName) => {
    setUserState(stateName);
    const fee = STATE_BETTING_FEES[stateName] || 0;
    setBettingFee(fee);
    setShowStatePicker(false);
  }, []);

  // Handle custom fee input
  const handleCustomFeeChange = useCallback((value) => {
    setCustomFee(value);
    const fee = parseFloat(value) || 0;
    setBettingFee(fee);
  }, []);

  // Calculate the total fee (2 bets)
  const getTotalFee = useCallback(() => {
    if (!includeFee || bettingFee === 0) return 0;
    return bettingFee * 2;
  }, [includeFee, bettingFee]);

  const handleCalculate = useCallback(() => {
    const totalFee = getTotalFee();
    if (mode === 'calculator') {
      const calculation = calculateHedge(originalStake, originalOdds, hedgeOdds, isFreeBet, totalFee);
      setResult(calculation);
      setManualResult(null);
    } else {
      const calculation = calculateManualProfit(originalStake, originalOdds, hedgeStake, hedgeOdds, isFreeBet, totalFee);
      setManualResult(calculation);
      setResult(null);
    }
  }, [mode, originalStake, originalOdds, hedgeOdds, hedgeStake, isFreeBet, getTotalFee]);

  const handleClear = useCallback(() => {
    setOriginalStake('');
    setOriginalOdds('');
    setHedgeOdds('');
    setHedgeStake('');
    setIsFreeBet(false);
    setResult(null);
    setManualResult(null);
    setIncludeFee(false);
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

        {/* Add Betting Fee Button */}
        {!showFeeCard ? (
          <TouchableOpacity
            style={styles.addFeeButton}
            onPress={() => setShowFeeCard(true)}
          >
            <Text style={styles.addFeeButtonText}>Add Betting Fee</Text>
          </TouchableOpacity>
        ) : (
          /* Betting Fee Card */
          <View style={styles.feeCard}>
            <View style={styles.feeHeader}>
              <Text style={styles.feeTitle}>BETTING FEE</Text>
              <TouchableOpacity
                style={styles.closeFeeButton}
                onPress={() => {
                  setShowFeeCard(false);
                  setIncludeFee(false);
                  setBettingFee(0);
                  setCustomFee('');
                }}
              >
                <Text style={styles.closeFeeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Fee Input Mode Toggle - 3 options */}
            <View style={styles.feeInputModeToggle}>
            <TouchableOpacity
              style={[styles.feeInputModeButton, feeInputMode === 'location' && styles.feeInputModeButtonActive]}
              onPress={() => setFeeInputMode('location')}
            >
              <Text style={[styles.feeInputModeText, feeInputMode === 'location' && styles.feeInputModeTextActive]}>
                LOCATE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feeInputModeButton, feeInputMode === 'state' && styles.feeInputModeButtonActive]}
              onPress={() => setFeeInputMode('state')}
            >
              <Text style={[styles.feeInputModeText, feeInputMode === 'state' && styles.feeInputModeTextActive]}>
                STATE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feeInputModeButton, feeInputMode === 'custom' && styles.feeInputModeButtonActive]}
              onPress={() => setFeeInputMode('custom')}
            >
              <Text style={[styles.feeInputModeText, feeInputMode === 'custom' && styles.feeInputModeTextActive]}>
                CUSTOM
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.feeContent}>
            {feeInputMode === 'location' ? (
              <>
                {/* Location Detection */}
                {locationLoading ? (
                  <View style={styles.locationLoadingContainer}>
                    <ActivityIndicator size="small" color="#D4AF37" />
                    <Text style={styles.locationLoadingText}>Detecting location...</Text>
                  </View>
                ) : userState && !locationError ? (
                  <View style={styles.locationResultContainer}>
                    <Text style={styles.feeStateText}>
                      Detected: <Text style={styles.feeStateName}>{userState}</Text>
                    </Text>
                    <View style={styles.feeDisplayContainer}>
                      <Text style={styles.feeAmountText}>
                        Fee per bet: <Text style={styles.feeAmount}>${bettingFee.toFixed(2)}</Text>
                      </Text>
                      {bettingFee === 0 && (
                        <Text style={styles.feeNoFeeText}>No betting fee in {userState}!</Text>
                      )}
                    </View>
                    <TouchableOpacity style={styles.detectButton} onPress={detectLocation}>
                      <Text style={styles.detectButtonText}>REFRESH LOCATION</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.locationPromptContainer}>
                    {locationError && (
                      <Text style={styles.locationErrorText}>{locationError}</Text>
                    )}
                    <Text style={styles.locationPromptText}>
                      Detect your state automatically to get the local betting fee
                    </Text>
                    <TouchableOpacity style={styles.detectButton} onPress={detectLocation}>
                      <Text style={styles.detectButtonText}>DETECT MY LOCATION</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : feeInputMode === 'state' ? (
              <>
                {/* State Selector */}
                <TouchableOpacity 
                  style={styles.stateSelector}
                  onPress={() => setShowStatePicker(true)}
                >
                  <Text style={styles.stateSelectorLabel}>STATE</Text>
                  <View style={styles.stateSelectorValue}>
                    <Text style={userState ? styles.stateSelectorText : styles.stateSelectorPlaceholder}>
                      {userState || 'Tap to select state'}
                    </Text>
                    <Text style={styles.stateSelectorArrow}>▼</Text>
                  </View>
                </TouchableOpacity>

                {userState && (
                  <View style={styles.feeDisplayContainer}>
                    <Text style={styles.feeAmountText}>
                      Fee per bet: <Text style={styles.feeAmount}>${bettingFee.toFixed(2)}</Text>
                    </Text>
                    {bettingFee === 0 && (
                      <Text style={styles.feeNoFeeText}>No betting fee in {userState}!</Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Custom Fee Input */}
                <View style={styles.customFeeInput}>
                  <Text style={styles.customFeeLabel}>FEE PER BET ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.50"
                    placeholderTextColor="#555"
                    keyboardType="decimal-pad"
                    value={customFee}
                    onChangeText={handleCustomFeeChange}
                  />
                </View>
                {bettingFee > 0 && (
                  <Text style={styles.customFeeHint}>
                    Total fees for 2 bets: ${(bettingFee * 2).toFixed(2)}
                  </Text>
                )}
              </>
            )}

            {/* Include Fee Toggle - only show when there's a fee */}
            {bettingFee > 0 && (
              <View style={styles.feeToggleContainer}>
                <View style={styles.feeToggleTextContainer}>
                  <Text style={styles.feeToggleLabel}>Include fees as expense</Text>
                  <Text style={styles.feeToggleDescription}>
                    Deducts ${(bettingFee * 2).toFixed(2)} from profit (2 bets)
                  </Text>
                </View>
                <Switch
                  value={includeFee}
                  onValueChange={setIncludeFee}
                  trackColor={{ false: '#333', true: '#D4AF37' }}
                  thumbColor={includeFee ? '#FFD700' : '#666'}
                  ios_backgroundColor="#333"
                />
              </View>
            )}
          </View>
        </View>
        )}

        {/* State Picker Modal */}
        <Modal
          visible={showStatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>SELECT STATE</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowStatePicker(false)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={US_STATES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.stateOption,
                      userState === item && styles.stateOptionSelected
                    ]}
                    onPress={() => handleStateSelect(item)}
                  >
                    <Text style={[
                      styles.stateOptionText,
                      userState === item && styles.stateOptionTextSelected
                    ]}>
                      {item}
                    </Text>
                    <Text style={styles.stateOptionFee}>
                      ${(STATE_BETTING_FEES[item] || 0).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={true}
              />
            </View>
          </View>
        </Modal>

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

            {includeFee && bettingFee > 0 && (
              <View style={styles.feeDeductionNote}>
                <Text style={styles.feeDeductionText}>
                  * Includes ${result.totalFee} betting fees ({userState || 'custom'})
                </Text>
              </View>
            )}
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

            {includeFee && bettingFee > 0 && (
              <View style={styles.feeDeductionNote}>
                <Text style={styles.feeDeductionText}>
                  * Includes ${manualResult.totalFee} betting fees ({userState || 'custom'})
                </Text>
              </View>
            )}
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
  // Add Betting Fee Button Styles
  addFeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addFeeButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addFeeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
    letterSpacing: 0.5,
  },
  // Betting Fee Card Styles
  feeCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  closeFeeButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  closeFeeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  feeTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4AF37',
    letterSpacing: 2,
  },
  feeContent: {
    marginTop: 4,
  },
  feeInputModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  feeInputModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 2,
    alignItems: 'center',
  },
  feeInputModeButtonActive: {
    backgroundColor: '#D4AF37',
  },
  feeInputModeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 1,
  },
  feeInputModeTextActive: {
    color: '#000',
  },
  stateSelector: {
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  stateSelectorLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
    letterSpacing: 1,
  },
  stateSelectorValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateSelectorText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  stateSelectorPlaceholder: {
    fontSize: 16,
    color: '#555',
  },
  stateSelectorArrow: {
    fontSize: 12,
    color: '#D4AF37',
  },
  feeDisplayContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  feeAmountText: {
    fontSize: 13,
    color: '#888',
  },
  feeAmount: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  feeNoFeeText: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
  },
  customFeeInput: {
    marginBottom: 8,
  },
  customFeeLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
    letterSpacing: 1,
  },
  customFeeHint: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
  },
  feeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 3,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  feeToggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  feeToggleLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  feeToggleDescription: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  feeDeductionNote: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  feeDeductionText: {
    fontSize: 10,
    color: '#D4AF37',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#888',
  },
  stateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  stateOptionSelected: {
    backgroundColor: '#1a1a1a',
  },
  stateOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  stateOptionTextSelected: {
    color: '#D4AF37',
    fontWeight: '600',
  },
  stateOptionFee: {
    fontSize: 12,
    color: '#888',
  },
  // Location Detection Styles
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  locationLoadingText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 10,
  },
  locationResultContainer: {
    marginBottom: 8,
  },
  locationPromptContainer: {
    alignItems: 'center',
    padding: 8,
  },
  locationPromptText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  locationErrorText: {
    fontSize: 12,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 8,
  },
  feeStateText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  feeStateName: {
    color: '#fff',
    fontWeight: '600',
  },
  detectButton: {
    backgroundColor: '#222',
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginTop: 8,
  },
  detectButtonText: {
    fontSize: 11,
    color: '#D4AF37',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
