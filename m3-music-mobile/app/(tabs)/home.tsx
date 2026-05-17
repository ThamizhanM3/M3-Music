import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import api from '../../services/api';
import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const { user } = useAuthStore();
  const { playTrack } = usePlayerStore();
  const router = useRouter();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await api.get('/music/songs');
      setSongs(response.data);
    } catch (error) {
      console.log('Error fetching songs', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View className="flex-1 bg-background pt-12 px-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-2xl font-bold">{getGreeting()}</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} className="p-2">
          <Settings size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-white text-xl font-bold mb-4">All Songs</Text>
        
        {loading ? (
          <ActivityIndicator color="#1DB954" size="large" className="mt-8" />
        ) : (
          <View className="space-y-4">
            {songs.map((song) => (
              <TouchableOpacity 
                key={song._id}
                className="flex-row items-center bg-surface/50 p-2 rounded-lg"
                onPress={() => playTrack(song, songs)}
              >
                <Image 
                  source={{ uri: song.imageUrl || 'https://via.placeholder.com/150' }} 
                  className="w-14 h-14 rounded bg-white/5"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold text-base" numberOfLines={1}>{song.title}</Text>
                  <Text className="text-textSub text-sm" numberOfLines={1}>{song.artist}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
