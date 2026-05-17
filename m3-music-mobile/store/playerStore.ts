import { create } from 'zustand';
import { Audio } from 'expo-av';

interface PlayerState {
  isPlayerReady: boolean;
  isPlaying: boolean;
  currentTrack: any | null;
  queue: any[];
  soundObject: Audio.Sound | null;
  position: number;
  duration: number;
  setPlayerReady: (isReady: boolean) => void;
  playTrack: (track: any, newQueue?: any[]) => Promise<void>;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlayerReady: false,
  isPlaying: false,
  currentTrack: null,
  queue: [],
  soundObject: null,
  position: 0,
  duration: 1,

  setPlayerReady: (isReady) => set({ isPlayerReady: isReady }),

  playTrack: async (track, newQueue) => {
    try {
      const { soundObject: currentSound } = get();
      if (currentSound) {
        await currentSound.unloadAsync();
      }

      if (newQueue) {
        set({ queue: newQueue });
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded) {
            set({
              position: status.positionMillis / 1000,
              duration: status.durationMillis ? status.durationMillis / 1000 : 1,
              isPlaying: status.isPlaying,
            });
            if (status.didJustFinish) {
              get().skipToNext();
            }
          }
        }
      );

      set({ soundObject: sound, currentTrack: track, isPlaying: true });
    } catch (error) {
      console.log("Error playing track", error);
    }
  },

  togglePlayback: async () => {
    const { soundObject, isPlaying } = get();
    if (!soundObject) return;

    if (isPlaying) {
      await soundObject.pauseAsync();
    } else {
      await soundObject.playAsync();
    }
    set({ isPlaying: !isPlaying });
  },

  skipToNext: async () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t._id === currentTrack._id);
    const nextIndex = (currentIndex + 1) % queue.length;
    await get().playTrack(queue[nextIndex]);
  },

  skipToPrevious: async () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t._id === currentTrack._id);
    const prevIndex = currentIndex - 1 < 0 ? queue.length - 1 : currentIndex - 1;
    await get().playTrack(queue[prevIndex]);
  },

  seekTo: async (position: number) => {
    const { soundObject } = get();
    if (soundObject) {
      await soundObject.setPositionAsync(position * 1000);
      set({ position });
    }
  }
}));
