# M3 Music Mobile App

A cross-platform React Native mobile application for M3 Music. Built with Expo, NativeWind, Zustand, and React Native Track Player.

## Features
- **Cross-Platform**: iOS & Android support
- **Premium UI**: Dark mode, Spotify-inspired layout
- **Background Audio**: Playback continues when the app is minimized
- **Global State Management**: Zustand for player & auth
- **Existing Backend**: Integrates with the current Node.js/MongoDB API

## Prerequisites
- Node.js
- Expo CLI (`npm install -g expo-cli`)
- For Track Player: Native development setup is required (Android Studio or Xcode) since we use `react-native-track-player`.

## Setup
1. Change to the mobile directory:
   ```bash
   cd m3-music-mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate native directories (Expo Prebuild):
   ```bash
   npx expo prebuild
   ```

## Development
Run the custom dev client for your platform:
- **Android**: `npx expo run:android`
- **iOS**: `npx expo run:ios`

*Note: You cannot use Expo Go because `react-native-track-player` requires native code linking.*

## Environment Configuration
The app will connect to your local backend automatically. If testing on a physical device, update `EXPO_PUBLIC_API_URL` in `services/api.ts` or via an `.env` file to point to your computer's local IP address instead of `10.0.2.2`.
