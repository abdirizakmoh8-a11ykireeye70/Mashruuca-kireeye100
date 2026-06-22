// ============================================================
//  KIREEYE — SplashScreen.js
// ============================================================
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../App';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.stagger(150, dotsAnim.map(d =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      )),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <Animated.View style={[s.logoWrap, { transform: [{ scale }], opacity }]}>
        {/* K made of house shape */}
        <View style={s.logoBox}>
          <View style={s.kVertical} />
          <View style={s.kUpperArm} />
          <View style={s.kLowerArm} />
          <View style={s.door} />
        </View>
        <Text style={s.appName}>KIREEYE</Text>
        <Text style={s.tagline}>Gurigaaga Hel Maanta</Text>
      </Animated.View>
      <View style={s.dots}>
        {dotsAnim.map((d, i) => (
          <Animated.View
            key={i}
            style={[s.dot, i === 1 && s.dotActive, { opacity: d }]}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
  logoWrap:   { alignItems: 'center', gap: 14 },
  logoBox:    { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  kVertical:  { position: 'absolute', left: 22, top: 18, width: 14, height: 64, backgroundColor: 'white', borderRadius: 4 },
  kUpperArm:  { position: 'absolute', left: 36, top: 18, width: 42, height: 14, backgroundColor: 'white', borderRadius: 4, transform: [{ rotate: '30deg' }, { translateY: 10 }] },
  kLowerArm:  { position: 'absolute', left: 36, bottom: 18, width: 42, height: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 4, transform: [{ rotate: '-30deg' }, { translateY: -10 }] },
  door:       { position: 'absolute', left: 36, bottom: 18, width: 10, height: 14, backgroundColor: COLORS.red, borderRadius: 2 },
  appName:    { color: 'white', fontSize: 30, fontWeight: '800', letterSpacing: 4 },
  tagline:    { color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 0.5 },
  dots:       { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive:  { width: 24, borderRadius: 4, backgroundColor: 'white' },
});


// ============================================================
//  KIREEYE — OnboardingScreen.js
// ============================================================
import React, { useRef, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext, COLORS } from '../App';

const { width } = Dimensions.get('window');

const SLIDES = [
  { icon: '🏠', titleKey: 'onboard1Title', descKey: 'onboard1Desc', color: '#FFF0F2' },
  { icon: '🔐', titleKey: 'onboard2Title', descKey: 'onboard2Desc', color: '#F0FDF4' },
  { icon: '💬', titleKey: 'onboard3Title', descKey: 'onboard3Desc', color: '#EFF6FF' },
  { icon: '🚀', titleKey: 'onboard4Title', descKey: 'onboard4Desc', color: '#FFFBEB' },
];

export default function OnboardingScreen({ navigation }) {
  const { t } = useContext(AppContext);
  const [index, setIndex] = useState(0);
  const flatRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    navigation.replace('Login');
  };

  return (
    <View style={ob.root}>
      <TouchableOpacity style={ob.skip} onPress={finish}>
        <Text style={ob.skipTxt}>{t('skip')}</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => i.toString()}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[ob.slide]}>
            <View style={[ob.imageArea, { backgroundColor: item.color }]}>
              <Text style={ob.slideIcon}>{item.icon}</Text>
              <View style={ob.wave} />
            </View>
            <View style={ob.textArea}>
              <Text style={ob.slideTitle}>{t(item.titleKey)}</Text>
              <Text style={ob.slideDesc}>{t(item.descKey)}</Text>
            </View>
          </View>
        )}
      />

      <View style={ob.footer}>
        <View style={ob.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [6, 20, 6], extrapolate: 'clamp' });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[ob.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>
        <TouchableOpacity style={ob.nextBtn} onPress={goNext}>
          <Text style={ob.nextTxt}>{index === SLIDES.length - 1 ? t('done') : t('next') + ' →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ob = StyleSheet.create({
  root:       { flex: 1, backgroundColor: 'white' },
  skip:       { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipTxt:    { color: COLORS.gray400, fontSize: 14, fontWeight: '500' },
  slide:      { width, flex: 1 },
  imageArea:  { height: 320, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  slideIcon:  { fontSize: 100 },
  wave:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  textArea:   { flex: 1, paddingHorizontal: 32, paddingTop: 16 },
  slideTitle: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: 14, lineHeight: 32 },
  slideDesc:  { fontSize: 15, color: COLORS.gray600, lineHeight: 24 },
  footer:     { paddingHorizontal: 24, paddingBottom: 48, gap: 20 },
  dotsRow:    { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot:        { height: 6, borderRadius: 3, backgroundColor: COLORS.red },
  nextBtn:    { backgroundColor: COLORS.red, borderRadius: 16, padding: 16, alignItems: 'center' },
  nextTxt:    { color: 'white', fontSize: 16, fontWeight: '700' },
});


// ============================================================
//  KIREEYE — LoginScreen.js
// ============================================================
import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendOTP } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

export default function LoginScreen({ navigation }) {
  const { t, language, setLanguage } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (text) => {
    const digits = text.replace(/\D/g, '');
    setPhone(digits);
  };

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      Alert.alert('', 'Lambarka taleefanka si sax ah geli');
      return;
    }
    setLoading(true);
    const fullPhone = digits.startsWith('252') ? `+${digits}` : `+252${digits}`;
    const res = await sendOTP(fullPhone);
    setLoading(false);
    if (res.success) {
      navigation.navigate('OTP', { confirmation: res.confirmation, phone: fullPhone });
    } else {
      Alert.alert(t('error'), res.error || t('networkError'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[ls.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Language Selector */}
        <View style={ls.langRow}>
          {['so', 'en', 'ar'].map(lang => (
            <TouchableOpacity
              key={lang}
              style={[ls.langBtn, language === lang && ls.langBtnActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={[ls.langTxt, language === lang && ls.langTxtActive]}>
                {lang === 'so' ? '🇸🇴 SO' : lang === 'en' ? '🇬🇧 EN' : '🇸🇦 AR'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={ls.body}>
          {/* Logo */}
          <View style={ls.logoWrap}>
            <View style={ls.logoBox}>
              <View style={ls.kV} /><View style={ls.kU} /><View style={ls.kL} />
            </View>
            <Text style={ls.appName}>KIREEYE</Text>
            <Text style={ls.tagline}>{t('tagline')}</Text>
          </View>

          {/* Phone Input */}
          <Text style={ls.label}>{t('phoneNumber')}</Text>
          <View style={ls.phoneRow}>
            <View style={ls.countryCode}>
              <Text style={ls.countryTxt}>🇸🇴 +252</Text>
            </View>
            <TextInput
              style={ls.phoneInput}
              placeholder="63 608 9179"
              placeholderTextColor={COLORS.gray400}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={formatPhone}
              maxLength={12}
            />
          </View>

          <TouchableOpacity
            style={[ls.btn, loading && { opacity: 0.7 }]}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={ls.btnTxt}>{t('sendOtp')} →</Text>
            }
          </TouchableOpacity>

          <View style={ls.divider}>
            <View style={ls.divLine} />
            <Text style={ls.divTxt}>{t('orContinueWith')}</Text>
            <View style={ls.divLine} />
          </View>

          <TouchableOpacity style={ls.googleBtn}>
            <Text style={ls.googleIcon}>G</Text>
            <Text style={ls.googleTxt}>{t('continueWithGoogle')}</Text>
          </TouchableOpacity>

          <Text style={ls.terms}>
            {t('agreeToTerms')}{' '}
            <Text style={{ color: COLORS.red }}>{t('termsOfService')}</Text>
            {' '}&{' '}
            <Text style={{ color: COLORS.red }}>{t('privacyPolicy')}</Text>
          </Text>
        </View>
      </ScrollView>
      <View id="recaptcha-container" />
    </KeyboardAvoidingView>
  );
}

const ls = StyleSheet.create({
  root:       { flex: 1, backgroundColor: 'white' },
  langRow:    { flexDirection: 'row', gap: 8, padding: 16, justifyContent: 'flex-end' },
  langBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.gray200 },
  langBtnActive: { borderColor: COLORS.red, backgroundColor: COLORS.redSoft },
  langTxt:    { fontSize: 11, fontWeight: '600', color: COLORS.gray600 },
  langTxtActive: { color: COLORS.red },
  body:       { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  logoWrap:   { alignItems: 'center', marginBottom: 36 },
  logoBox:    { width: 72, height: 72, backgroundColor: COLORS.redSoft, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  kV:         { position: 'absolute', left: 16, top: 12, width: 10, height: 48, backgroundColor: COLORS.red, borderRadius: 3 },
  kU:         { position: 'absolute', left: 26, top: 12, width: 28, height: 10, backgroundColor: COLORS.red, borderRadius: 3, transform: [{ rotate: '28deg' }, { translateY: 7 }] },
  kL:         { position: 'absolute', left: 26, bottom: 12, width: 28, height: 10, backgroundColor: '#FF6B7D', borderRadius: 3, transform: [{ rotate: '-28deg' }, { translateY: -7 }] },
  appName:    { fontSize: 26, fontWeight: '800', color: COLORS.red, letterSpacing: 4 },
  tagline:    { fontSize: 12, color: COLORS.gray400, marginTop: 4 },
  label:      { fontSize: 12, fontWeight: '600', color: COLORS.gray600, marginBottom: 8 },
  phoneRow:   { flexDirection: 'row', gap: 10, marginBottom: 20 },
  countryCode:{ borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: COLORS.gray50 },
  countryTxt: { fontSize: 14, color: COLORS.black, fontWeight: '500' },
  phoneInput: { flex: 1, borderWidth: 1.5, borderColor: COLORS.red, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, color: COLORS.black, backgroundColor: 'white' },
  btn:        { backgroundColor: COLORS.red, borderRadius: 16, padding: 15, alignItems: 'center', marginBottom: 20 },
  btnTxt:     { color: 'white', fontSize: 16, fontWeight: '700' },
  divider:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divLine:    { flex: 1, height: 1, backgroundColor: COLORS.gray200 },
  divTxt:     { fontSize: 12, color: COLORS.gray400 },
  googleBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 16, padding: 14, marginBottom: 20 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleTxt:  { fontSize: 14, fontWeight: '500', color: COLORS.gray800 },
  terms:      { fontSize: 11, color: COLORS.gray400, textAlign: 'center', lineHeight: 18 },
});


// ============================================================
//  KIREEYE — OTPScreen.js
// ============================================================
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyOTP, createUserProfile } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

export default function OTPScreen({ route, navigation }) {
  const { confirmation, phone } = route.params;
  const { t } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [otp,     setOtp]     = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(60);
  const refs = Array.from({ length: 6 }, () => useRef(null));
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setTimer(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (val, idx) => {
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) refs[idx + 1].current?.focus();
    if (newOtp.every(d => d !== '')) handleVerify(newOtp.join(''));
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async (code) => {
    setLoading(true);
    const res = await verifyOTP(confirmation, code || otp.join(''));
    if (res.success) {
      await createUserProfile(res.user.uid, { phone });
      // Navigate handled by auth state change in App.js
    } else {
      shake();
      setOtp(['', '', '', '', '', '']);
      refs[0].current?.focus();
      Alert.alert(t('error'), 'OTP-ga waa khalad. Mar kale isku day.');
    }
    setLoading(false);
  };

  return (
    <View style={[os.root, { paddingTop: insets.top }]}>
      <TouchableOpacity style={os.back} onPress={() => navigation.goBack()}>
        <Text style={{ fontSize: 24, color: COLORS.gray600 }}>←</Text>
      </TouchableOpacity>

      <View style={os.body}>
        <Text style={os.icon}>📱</Text>
        <Text style={os.title}>{t('enterOtp')}</Text>
        <Text style={os.subtitle}>{t('otpSent')}{'\n'}<Text style={{ color: COLORS.red, fontWeight: '700' }}>{phone}</Text></Text>

        <Animated.View style={[os.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              style={[os.otpBox, digit && os.otpBoxFilled]}
              value={digit}
              onChangeText={val => handleChange(val.slice(-1), i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        <TouchableOpacity
          style={[os.btn, loading && { opacity: 0.7 }]}
          onPress={() => handleVerify()}
          disabled={loading || otp.some(d => !d)}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={os.btnTxt}>{t('verifyOtp')}</Text>
          }
        </TouchableOpacity>

        <View style={os.resendRow}>
          {timer > 0
            ? <Text style={os.timerTxt}>Dib u dir: 0:{timer.toString().padStart(2, '0')}</Text>
            : <TouchableOpacity><Text style={os.resendTxt}>{t('resendOtp')}</Text></TouchableOpacity>
          }
        </View>
      </View>
    </View>
  );
}

const os = StyleSheet.create({
  root:       { flex: 1, backgroundColor: 'white' },
  back:       { paddingHorizontal: 20, paddingTop: 16 },
  body:       { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  icon:       { fontSize: 60, marginBottom: 20 },
  title:      { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: 10 },
  subtitle:   { fontSize: 14, color: COLORS.gray600, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  otpRow:     { flexDirection: 'row', gap: 10, marginBottom: 32 },
  otpBox:     { width: 46, height: 54, borderWidth: 2, borderColor: COLORS.gray200, borderRadius: 14, textAlign: 'center', fontSize: 22, fontWeight: '700', color: COLORS.black, backgroundColor: COLORS.gray50 },
  otpBoxFilled: { borderColor: COLORS.red, backgroundColor: COLORS.redSoft },
  btn:        { backgroundColor: COLORS.red, borderRadius: 16, padding: 15, alignItems: 'center', width: '100%', marginBottom: 20 },
  btnTxt:     { color: 'white', fontSize: 16, fontWeight: '700' },
  resendRow:  { alignItems: 'center' },
  timerTxt:   { color: COLORS.gray400, fontSize: 13 },
  resendTxt:  { color: COLORS.red, fontSize: 13, fontWeight: '600' },
});


// ============================================================
//  KIREEYE — SelfieScreen.js
// ============================================================
import React, { useContext, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitSelfieVerification } from '../../services/reportVerifNotifService';
import { AppContext, COLORS } from '../../App';

export default function SelfieScreen() {
  const { user, t } = useContext(AppContext);
  const insets  = useSafeAreaInsets();
  const device  = useCameraDevice('front');
  const camera  = useRef(null);
  const [loading, setLoading] = useState(false);
  const [taken,   setTaken]   = useState(false);

  const takeSelfie = async () => {
    if (!camera.current) return;
    setLoading(true);
    try {
      const photo = await camera.current.takePhoto({ qualityPrioritization: 'balanced', flash: 'off' });
      const res   = await fetch(`file://${photo.path}`);
      const blob  = await res.blob();
      await submitSelfieVerification(user.uid, blob);
      setTaken(true);
    } catch (e) {
      Alert.alert(t('error'), t('uploadError'));
    }
    setLoading(false);
  };

  if (taken) {
    return (
      <View style={[ss.root, ss.center, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 72 }}>✅</Text>
        <Text style={ss.doneTitle}>{t('selfieSubmitted')}</Text>
        <Text style={ss.doneSub}>Admin ayaa 24 saac gudaheed xaqiijin doona</Text>
      </View>
    );
  }

  if (!device) return (
    <View style={[ss.root, ss.center]}>
      <ActivityIndicator color={COLORS.red} size="large" />
    </View>
  );

  return (
    <View style={[ss.root, { paddingTop: insets.top }]}>
      <Text style={ss.title}>{t('verifyIdentity')}</Text>
      <Text style={ss.sub}>{t('selfieInstructions')}</Text>
      <View style={ss.cameraWrap}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
        />
        {/* Face guide oval */}
        <View style={ss.ovalGuide} />
        {/* Corner decorations */}
        <View style={[ss.corner, ss.cornerTL]} />
        <View style={[ss.corner, ss.cornerTR]} />
        <View style={[ss.corner, ss.cornerBL]} />
        <View style={[ss.corner, ss.cornerBR]} />
      </View>
      <TouchableOpacity
        style={[ss.captureBtn, loading && { opacity: 0.6 }]}
        onPress={takeSelfie}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="white" />
          : <Text style={ss.captureTxt}>📸 {t('takeSelfie')}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const ss = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.black, padding: 20 },
  center:     { alignItems: 'center', justifyContent: 'center' },
  title:      { color: 'white', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sub:        { color: COLORS.gray400, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  ovalGuide:  { position: 'absolute', top: '15%', left: '20%', width: '60%', height: '55%', borderWidth: 2.5, borderColor: COLORS.red, borderRadius: 200, borderStyle: 'dashed' },
  corner:     { position: 'absolute', width: 24, height: 24, borderColor: COLORS.red, borderWidth: 3 },
  cornerTL:   { top: 12, left: 12, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
  cornerTR:   { top: 12, right: 12, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
  cornerBL:   { bottom: 12, left: 12, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR:   { bottom: 12, right: 12, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },
  captureBtn: { backgroundColor: COLORS.red, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20 },
  captureTxt: { color: 'white', fontSize: 16, fontWeight: '700' },
  doneTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.black, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  doneSub:    { fontSize: 13, color: COLORS.gray600, textAlign: 'center' },
});

