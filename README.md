# Bet Hedger

A mobile app to calculate the optimal hedge bet amount for guaranteed profit. Built with React Native and Expo.

## Features

- **Hedge Calculator**: Calculate the exact amount to bet to guarantee profit
- **Free Bet Support**: Toggle for when your original stake is bonus/promotional money
- **American Odds**: Supports standard American betting odds (+150, -110, etc.)
- **Real-time Results**: See profit scenarios for both outcomes

## How Hedging Works

When you have a bet placed at certain odds, you can "hedge" by betting the opposite outcome at a sportsbook. This calculator tells you exactly how much to bet on the hedge to guarantee profit regardless of the outcome.

### Normal Bet vs Free Bet

- **Normal Bet**: Your original stake is real money that you'll lose if your bet doesn't win
- **Free Bet**: Your original stake is promotional money - you only receive the winnings (not the stake back) if you win

Free bets are more valuable to hedge because you're not risking your own money on the original bet.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

After starting, you'll see options to run on:

- **Web (Windows testing)**: Press `w` to open in your browser
- **iOS**: Press `i` to open in iOS Simulator (Mac only) or scan QR with Expo Go app
- **Android**: Press `a` to open in Android emulator or scan QR with Expo Go app

## Usage Example

1. You placed a $100 bet at +200 odds on Team A
2. Team B is now available at -150 odds
3. Enter:
   - Original Stake: 100
   - Original Odds: +200
   - Hedge Odds: -150
4. Toggle "Free Bet" if your $100 was bonus money
5. Press "Calculate Hedge" to see the optimal hedge amount

## Tech Stack

- React Native
- Expo SDK 52
- TypeScript-ready

## Building for Production

```bash
# Build for web
npx expo export --platform web

# Build for iOS (requires Mac)
npx expo build:ios

# Build for Android
npx expo build:android
```

## License

MIT
