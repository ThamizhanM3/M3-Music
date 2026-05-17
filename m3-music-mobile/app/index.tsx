import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { token } = useAuthStore();
  
  if (!token) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
