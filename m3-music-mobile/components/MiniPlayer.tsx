import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayback, skipToNext } = usePlayerStore();
  const router = useRouter();

  if (!currentTrack) return null;

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => router.push('/player')}
      className="absolute bottom-[68px] left-2 right-2 bg-surface/95 rounded-lg flex-row items-center p-2 border border-white/10 shadow-lg"
    >
      <Image 
        source={{ uri: currentTrack.imageUrl || 'https://via.placeholder.com/150' }} 
        className="w-12 h-12 rounded-md bg-white/5"
      />
      <View className="flex-1 ml-3 justify-center">
        <Text className="text-textMain font-semibold" numberOfLines={1}>{currentTrack.title}</Text>
        <Text className="text-textSub text-sm" numberOfLines={1}>{currentTrack.artist}</Text>
      </View>
      <View className="flex-row items-center space-x-4 pr-2">
        <TouchableOpacity onPress={togglePlayback} className="p-2">
          {isPlaying ? (
            <Pause size={24} color="#FFF" fill="#FFF" />
          ) : (
            <Play size={24} color="#FFF" fill="#FFF" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={skipToNext} className="p-2">
          <SkipForward size={24} color="#FFF" fill="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
