import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import api from '../../services/api';

export default function LibraryScreen() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await api.get('/playlists');
      setPlaylists(response.data);
    } catch (error) {
      console.log('Error fetching playlists', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-3xl font-bold">Your Library</Text>
        <TouchableOpacity className="p-2">
          <Plus size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1DB954" size="large" className="mt-8" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {playlists.map((playlist) => (
            <TouchableOpacity 
              key={playlist._id}
              className="flex-row items-center mb-4 bg-surface p-4 rounded-lg"
              onPress={() => router.push(`/playlist/${playlist._id}`)}
            >
              <View className="w-16 h-16 bg-[#282828] rounded flex items-center justify-center">
                <Text className="text-white font-bold text-xl">{playlist.name.charAt(0)}</Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-white font-semibold text-lg">{playlist.name}</Text>
                <Text className="text-textSub text-sm mt-1">{playlist.songs?.length || 0} songs</Text>
              </View>
            </TouchableOpacity>
          ))}
          {playlists.length === 0 && (
            <Text className="text-center text-textSub mt-10">No playlists found. Create one!</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
