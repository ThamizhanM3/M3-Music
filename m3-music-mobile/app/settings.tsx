import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'expo-router';
import { ChevronLeft, LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-4 mt-8 bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={28} color="#FFF" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-4">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row items-center mb-8 bg-surface p-4 rounded-lg">
          <View className="w-16 h-16 bg-[#1DB954] rounded-full items-center justify-center">
            <Text className="text-white text-2xl font-bold">{user?.username?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-white text-xl font-bold">{user?.username || 'User'}</Text>
            <Text className="text-textSub text-sm">{user?.email || 'email@example.com'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          className="flex-row items-center justify-between bg-surface p-4 rounded-lg mt-4"
          onPress={handleLogout}
        >
          <Text className="text-red-500 text-lg font-semibold">Log Out</Text>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
