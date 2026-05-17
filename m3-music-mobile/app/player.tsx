import React from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Repeat, Shuffle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../store/playerStore';

const { width } = Dimensions.get('window');

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function PlayerScreen() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlayback, skipToNext, skipToPrevious, position, duration } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <SafeAreaView className="flex-1 bg-[#121212]">
      <View className="px-6 flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center py-4 mt-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronDown size={32} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white text-sm font-bold tracking-widest">NOW PLAYING</Text>
          <View className="w-8" />
        </View>

        {/* Artwork */}
        <View className="items-center mt-8 shadow-2xl">
          <Image 
            source={{ uri: currentTrack.imageUrl || 'https://via.placeholder.com/300' }} 
            style={{ width: width - 48, height: width - 48, borderRadius: 8 }}
          />
        </View>

        {/* Track Info */}
        <View className="mt-12 flex-row justify-between items-center">
          <View className="flex-1 pr-4">
            <Text className="text-white text-2xl font-bold" numberOfLines={1}>{currentTrack.title}</Text>
            <Text className="text-[#B3B3B3] text-lg mt-1" numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
        </View>

        {/* Progress */}
        <View className="mt-8">
          <View className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <View 
              className="h-full bg-primary" 
              style={{ width: `${(position / (duration || 1)) * 100}%` }} 
            />
          </View>
          <View className="flex-row justify-between mt-2">
            <Text className="text-[#B3B3B3] text-xs">{formatTime(position)}</Text>
            <Text className="text-[#B3B3B3] text-xs">{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row justify-between items-center mt-8">
          <TouchableOpacity className="p-2">
            <Shuffle size={24} color="#1DB954" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={skipToPrevious} className="p-2">
            <SkipBack size={40} color="#FFF" fill="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={togglePlayback} 
            className="w-20 h-20 rounded-full bg-primary items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <Pause size={32} color="#000" fill="#000" />
            ) : (
              <Play size={32} color="#000" fill="#000" className="ml-2" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={skipToNext} className="p-2">
            <SkipForward size={40} color="#FFF" fill="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity className="p-2">
            <Repeat size={24} color="#B3B3B3" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
