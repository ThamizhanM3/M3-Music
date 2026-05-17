import { Stack } from 'expo-router';
import "../global.css";
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { setupPlayer } from '../services/playerService';
import { usePlayerStore } from '../store/playerStore';

export default function RootLayout() {
  const { setPlayerReady } = usePlayerStore();

  useEffect(() => {
    async function init() {
      const isSetup = await setupPlayer();
      setPlayerReady(isSetup);
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
