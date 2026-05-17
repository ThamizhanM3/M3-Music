import { Tabs } from 'expo-router';
import { Home, Search, Library } from 'lucide-react-native';
import { View } from 'react-native';
import MiniPlayer from '../../components/MiniPlayer';

export default function TabLayout() {
  return (
    <View className="flex-1 bg-background">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#282828',
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#B3B3B3',
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <Search size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => <Library size={24} color={color} />,
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
