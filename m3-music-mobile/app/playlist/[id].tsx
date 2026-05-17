import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Play } from 'lucide-react-native';
import api from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const response = await api.get(`/playlists/${id}`);
      setPlaylist(response.data);
    } catch (error) {
      console.log('Error fetching playlist', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (playlist?.songs?.length > 0) {
      playTrack(playlist.songs[0], playlist.songs);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator color="#1DB954" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-4 mt-8">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 py-4">
          <Text className="text-white text-4xl font-bold">{playlist?.name}</Text>
          <Text className="text-textSub mt-2">{playlist?.songs?.length || 0} songs</Text>
        </View>

        <View className="px-4 mt-2">
          <TouchableOpacity 
            onPress={handlePlayAll}
            className="w-14 h-14 bg-primary rounded-full items-center justify-center self-end mb-6"
          >
            <Play size={24} color="#000" fill="#000" className="ml-1" />
          </TouchableOpacity>

          {playlist?.songs?.map((song: any) => (
            <TouchableOpacity 
              key={song._id}
              className="flex-row items-center p-2 mb-2 bg-surface/30 rounded"
              onPress={() => playTrack(song, playlist.songs)}
            >
              <Image 
                source={{ uri: song.imageUrl || 'https://via.placeholder.com/150' }} 
                className="w-12 h-12 rounded bg-white/5"
              />
              <View className="ml-3 flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>{song.title}</Text>
                <Text className="text-textSub text-sm" numberOfLines={1}>{song.artist}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
