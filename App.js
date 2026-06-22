// ============================================================
//  KIREEYE — App.js (Entry Point)
//  React Native + Firebase
// ============================================================
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, I18nManager, Platform, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthChange } from './services/authService';
import { getUserProfile } from './services/authService';
import { isRTL } from './i18n/translations';

// Screens
import SplashScreen    from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen     from './screens/auth/LoginScreen';
import OTPScreen       from './screens/auth/OTPScreen';
import SelfieScreen    from './screens/auth/SelfieScreen';
import HomeScreen      from './screens/home/HomeScreen';
import SearchScreen    from './screens/home/SearchScreen';
import ListingDetailScreen from './screens/listing/ListingDetailScreen';
import AddListingScreen from './screens/listing/AddListingScreen';
import EditListingScreen from './screens/listing/EditListingScreen';
import ChatListScreen  from './screens/chat/ChatListScreen';
import ChatScreen      from './screens/chat/ChatScreen';
import PaymentScreen   from './screens/payment/PaymentScreen';
import ProfileScreen   from './screens/profile/ProfileScreen';
import EditProfileScreen from './screens/profile/EditProfileScreen';
import BookingHistoryScreen from './screens/profile/BookingHistoryScreen';
import NotificationSettingsScreen from './screens/profile/NotificationSettingsScreen';
import SecurityScreen  from './screens/profile/SecurityScreen';
import HelpCenterScreen from './screens/help/HelpCenterScreen';
import AdminDashboard  from './screens/admin/AdminDashboard';

// Theme
export const COLORS = {
  red:       '#E8132A',
  redDark:   '#C00F22',
  redLight:  '#FF4D63',
  redSoft:   '#FFF0F2',
  white:     '#FFFFFF',
  gray50:    '#F9FAFB',
  gray100:   '#F3F4F6',
  gray200:   '#E5E7EB',
  gray400:   '#9CA3AF',
  gray600:   '#4B5563',
  gray800:   '#1F2937',
  black:     '#111827',
  green:     '#10B981',
  yellow:    '#F59E0B',
  // Dark mode
  darkBg:    '#0F0F0F',
  darkCard:  '#1A1A1A',
  darkBorder:'#2A2A2A',
};

// Context
export const AppContext = React.createContext({});

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Bottom Tab Navigator ─────────────────────────────────────
function MainTabs({ t, darkMode }) {
  const bg    = darkMode ? COLORS.darkCard  : COLORS.white;
  const inact = darkMode ? COLORS.gray600   : COLORS.gray400;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: darkMode ? COLORS.darkBorder : COLORS.gray100,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.red,
        tabBarInactiveTintColor: inact,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t('appName') === 'Kireeye' ? 'Hoyga' : 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: t('search'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text> }}
      />
      <Tab.Screen
        name="AddListing"
        component={AddListingScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <View style={{
              width: 52, height: 52,
              backgroundColor: COLORS.red,
              borderRadius: 16,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              shadowColor: COLORS.red,
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <Text style={{ fontSize: 26, color: 'white' }}>＋</Text>
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ tabBarLabel: t('typeMessage').includes('Fariin') ? 'Fariin' : 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💬</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('myProfile').includes('Profile') ? 'Profile' : 'ملفي',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ───────────────────────────────────────────
export default function App() {
  const [appReady, setAppReady]     = useState(false);
  const [user,     setUser]         = useState(null);
  const [profile,  setProfile]      = useState(null);
  const [language, setLanguage]     = useState('so');
  const [darkMode, setDarkMode]     = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const lang     = await AsyncStorage.getItem('language')   || 'so';
      const dark     = await AsyncStorage.getItem('darkMode')   === 'true';
      const onboard  = await AsyncStorage.getItem('onboarded') !== 'true';
      setLanguage(lang);
      setDarkMode(dark);
      setShowOnboard(onboard);

      // RTL for Arabic
      if (lang === 'ar') I18nManager.forceRTL(true);
      else               I18nManager.forceRTL(false);
    } catch (_) {}

    // Auth listener
    onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
        if (p?.language) setLanguage(p.language);
        if (p?.darkMode !== undefined) setDarkMode(p.darkMode);
      } else {
        setProfile(null);
      }
      setAppReady(true);
    });
  };

  const { getT } = require('./i18n/translations');
  const t = getT(language);

  if (!appReady) {
    return <SplashScreen />;
  }

  return (
    <AppContext.Provider value={{ user, profile, setProfile, language, setLanguage, darkMode, setDarkMode, t }}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? COLORS.darkBg : COLORS.white}
      />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!user ? (
            // ── Auth Stack ───────────────────────────────────
            <>
              {showOnboard && (
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              )}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OTP"   component={OTPScreen} />
            </>
          ) : !profile?.isVerified && profile?.verificationStatus !== 'pending' ? (
            // ── Selfie Verification ──────────────────────────
            <Stack.Screen name="Selfie" component={SelfieScreen} />
          ) : profile?.isAdmin ? (
            // ── Admin Stack ──────────────────────────────────
            <Stack.Screen name="Admin" component={AdminDashboard} />
          ) : (
            // ── Main App Stack ───────────────────────────────
            <>
              <Stack.Screen name="MainTabs">
                {() => <MainTabs t={t} darkMode={darkMode} />}
              </Stack.Screen>
              <Stack.Screen name="ListingDetail"   component={ListingDetailScreen} />
              <Stack.Screen name="EditListing"     component={EditListingScreen} />
              <Stack.Screen name="Chat"            component={ChatScreen} />
              <Stack.Screen name="Payment"         component={PaymentScreen} />
              <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
              <Stack.Screen name="BookingHistory"  component={BookingHistoryScreen} />
              <Stack.Screen name="NotifSettings"   component={NotificationSettingsScreen} />
              <Stack.Screen name="Security"        component={SecurityScreen} />
              <Stack.Screen name="HelpCenter"      component={HelpCenterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}

