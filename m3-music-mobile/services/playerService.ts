import { Audio } from 'expo-av';

export async function setupPlayer() {
  let isSetup = false;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isSetup = true;
  } catch (e) {
    console.log('Error setting up audio', e);
  }
  return isSetup;
}
