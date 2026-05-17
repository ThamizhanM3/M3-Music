import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { usePlayerStore } from '../../store/playerStore';
import api from '../../services/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 1) {
        searchSongs(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const searchSongs = async (q: string) => {
    try {
      const response = await api.get(`/music/search?q=${encodeURIComponent(q)}`);
      setResults(response.data);
    } catch (error) {
      console.log('Search error', error);
    }
  };

  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <Text className="text-white text-3xl font-bold mb-6">Search</Text>
      
      <View className="bg-white flex-row items-center px-4 py-3 rounded-lg mb-6">
        <SearchIcon size={20} color="#000" />
        <TextInput 
          className="flex-1 ml-3 text-black text-base"
          placeholder="What do you want to listen to?"
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {results.map((song) => (
          <TouchableOpacity 
            key={song._id}
            className="flex-row items-center p-2 mb-2"
            onPress={() => playTrack(song, results)}
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
        {query.length > 1 && results.length === 0 && (
          <Text className="text-center text-textSub mt-10">No results found for "{query}"</Text>
        )}
      </ScrollView>
    </View>
  );
}
