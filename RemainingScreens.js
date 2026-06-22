// ============================================================
//  KIREEYE — ChatListScreen.js
// ============================================================
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserChats } from '../../services/chatService';
import { getUserProfile } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

export default function ChatListScreen({ navigation }) {
  const { user, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [chats,   setChats]   = useState([]);
  const [loading, setLoading] = useState(true);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.white, card: COLORS.gray50, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  useEffect(() => {
    const unsub = getUserChats(user.uid, (data) => {
      setChats(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openChat = async (chat) => {
    const otherUid   = chat.participants.find(p => p !== user.uid);
    const otherUser  = await getUserProfile(otherUid);
    navigation.navigate('Chat', { chatId: chat.id, otherUser, listing: null });
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000)     return 'Hadda';
    if (diff < 3600000)   return `${Math.floor(diff / 60000)} dq`;
    if (diff < 86400000)  return `${Math.floor(diff / 3600000)} saa`;
    return d.toLocaleDateString();
  };

  if (loading) return (
    <View style={[cl.root, cl.center, { backgroundColor: C.bg }]}>
      <ActivityIndicator color={COLORS.red} size="large" />
    </View>
  );

  return (
    <View style={[cl.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[cl.header, { borderBottomColor: C.border }]}>
        <Text style={[cl.title, { color: C.text }]}>💬 Farriimahaaga</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={() => (
          <View style={cl.center}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>💬</Text>
            <Text style={[{ fontSize: 15, color: C.sub }]}>Wali fariin ma jirto</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const unread = item.unreadCount?.[user.uid] || 0;
          const isPaid = item.paymentStatus === 'both_paid';
          return (
            <TouchableOpacity
              style={[cl.chatItem, { borderBottomColor: C.border }]}
              onPress={() => openChat(item)}
            >
              <View style={cl.avatar}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={cl.topRow}>
                  <Text style={[cl.name, { color: C.text }]} numberOfLines={1}>
                    {item.participants.find(p => p !== user.uid)?.slice(0, 8) || '—'}
                  </Text>
                  <Text style={[cl.time, { color: C.sub }]}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View style={cl.bottomRow}>
                  <Text style={[cl.lastMsg, { color: C.sub }]} numberOfLines={1}>
                    {item.lastMessage || '...'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {isPaid && <Text style={{ fontSize: 10, color: COLORS.green }}>💰</Text>}
                    {unread > 0 && (
                      <View style={cl.badge}>
                        <Text style={cl.badgeTxt}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {item.dealConfirmed && (
                  <Text style={{ fontSize: 10, color: COLORS.green, marginTop: 2 }}>✅ Heshiis la xaqiijiyay</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const cl = StyleSheet.create({
  root:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  header:    { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title:     { fontSize: 20, fontWeight: '800' },
  chatItem:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  avatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  topRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:      { fontSize: 14, fontWeight: '700', flex: 1 },
  time:      { fontSize: 11 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg:   { fontSize: 12, flex: 1 },
  badge:     { backgroundColor: COLORS.red, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeTxt:  { color: 'white', fontSize: 10, fontWeight: '700' },
});


// ============================================================
//  KIREEYE — PaymentScreen.js
// ============================================================
import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  initiatePayment, confirmPayment, getPaymentInstructions, PAYMENT_METHODS,
} from '../../services/paymentService';
import { AppContext, COLORS } from '../../App';

export default function PaymentScreen({ route, navigation }) {
  const { chatId, listing, otherUser } = route.params;
  const { user, profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const lang = profile?.language || 'so';

  const [step,    setStep]    = useState(1); // 1=select method, 2=instructions, 3=confirm tx
  const [method,  setMethod]  = useState('ZAAD');
  const [txInfo,  setTxInfo]  = useState(null);
  const [txId,    setTxId]    = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400 }
    : { bg: COLORS.white, card: COLORS.gray50, text: COLORS.black, sub: COLORS.gray600 };

  const handleInitiate = async () => {
    setLoading(true);
    const res = await initiatePayment({ uid: user.uid, chatId, listingId: listing?.id, method });
    setTxInfo(res);
    setLoading(false);
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!txId.trim()) { Alert.alert('', 'Transaction ID geli'); return; }
    setLoading(true);
    const res = await confirmPayment({ txId: txInfo.txId, uid: user.uid, chatId, transactionId: txId });
    setLoading(false);
    if (res.success) {
      setDone(true);
    } else {
      Alert.alert(t('error'), t('paymentError'));
    }
  };

  if (done) return (
    <View style={[ps.root, ps.center, { backgroundColor: C.bg }]}>
      <Text style={{ fontSize: 80 }}>✅</Text>
      <Text style={[ps.doneTitle, { color: C.text }]}>{t('paymentSuccess')}</Text>
      <Text style={[ps.doneSub, { color: C.sub }]}>{t('contactShared')}</Text>
      <TouchableOpacity style={ps.doneBtn} onPress={() => navigation.goBack()}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t('done')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[ps.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={ps.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}>
          <Text style={{ fontSize: 22, color: C.sub }}>←</Text>
        </TouchableOpacity>
        <Text style={[ps.title, { color: C.text }]}>💰 {t('serviceFee')}</Text>
        <View />
      </View>

      {/* Progress */}
      <View style={ps.progress}>
        {[1, 2, 3].map(s => (
          <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={[ps.progressDot, step >= s && ps.progressDotActive]}>
              <Text style={{ color: step >= s ? 'white' : COLORS.gray400, fontSize: 12, fontWeight: '700' }}>{s}</Text>
            </View>
            <Text style={{ fontSize: 9, color: step >= s ? COLORS.red : COLORS.gray400 }}>
              {s === 1 ? 'Dooro' : s === 2 ? 'Bixi' : 'Xaqiiji'}
            </Text>
          </View>
        ))}
        <View style={[ps.progressLine, { left: '16%', right: '50%' }]} />
        <View style={[ps.progressLine, { left: '50%', right: '16%' }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Amount card */}
        <View style={[ps.amountCard, { backgroundColor: COLORS.red }]}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{t('serviceFee')}</Text>
          <Text style={{ color: 'white', fontSize: 48, fontWeight: '900' }}>$3</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' }}>{t('paymentDesc')}</Text>
        </View>

        {step === 1 && (
          <>
            <Text style={[ps.stepTitle, { color: C.text }]}>{t('payWith')}</Text>
            {Object.values(PAYMENT_METHODS).map(m => (
              <TouchableOpacity
                key={m.id}
                style={[ps.methodCard, { backgroundColor: C.card }, method === m.id.toUpperCase() && ps.methodCardActive]}
                onPress={() => setMethod(m.id.toUpperCase())}
              >
                <Text style={{ fontSize: 26 }}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 15, fontWeight: '700', color: C.text }]}>{m.name}</Text>
                  {m.number && <Text style={[{ fontSize: 12, color: C.sub, marginTop: 2 }]}>{m.number}</Text>}
                </View>
                <View style={[ps.radioOuter, method === m.id.toUpperCase() && ps.radioOuterActive]}>
                  {method === m.id.toUpperCase() && <View style={ps.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[ps.nextBtn, loading && { opacity: 0.7 }]}
              onPress={handleInitiate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={ps.nextBtnTxt}>Sii wad →</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && txInfo && (
          <>
            <Text style={[ps.stepTitle, { color: C.text }]}>Tilmaamaha Lacag Bixinta</Text>
            <View style={[ps.instructBox, { backgroundColor: C.card }]}>
              <Text style={[{ fontSize: 14, lineHeight: 22, color: C.text }]}>
                {getPaymentInstructions(method, 3, txInfo.reference, lang)}
              </Text>
            </View>
            <TouchableOpacity
              style={ps.copyBtn}
              onPress={() => { Clipboard.setString(txInfo.payTo || ''); Alert.alert('', 'Lambarka la koobiyay'); }}
            >
              <Text style={{ color: COLORS.red, fontWeight: '600' }}>📋 Lambarka Koobii</Text>
            </TouchableOpacity>
            <View style={[ps.refBox, { backgroundColor: COLORS.redSoft }]}>
              <Text style={{ color: COLORS.red, fontSize: 12 }}>Reference: </Text>
              <Text style={{ color: COLORS.red, fontSize: 14, fontWeight: '800' }}>{txInfo.reference}</Text>
            </View>
            <TouchableOpacity style={ps.nextBtn} onPress={() => setStep(3)}>
              <Text style={ps.nextBtnTxt}>Lacagta waan bixiyay →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[ps.stepTitle, { color: C.text }]}>Transaction ID Geli</Text>
            <Text style={[{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 20 }]}>
              Lacagta aad bixisay ka dib transaction ID-ga SMS-ka kugu yimid geli.
            </Text>
            <TextInput
              style={[ps.txInput, { backgroundColor: C.card, color: C.text }]}
              placeholder="TX123456789"
              placeholderTextColor={COLORS.gray400}
              value={txId}
              onChangeText={setTxId}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[ps.nextBtn, loading && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={ps.nextBtnTxt}>✅ Xaqiiji</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const ps = StyleSheet.create({
  root:         { flex: 1 },
  center:       { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title:        { fontSize: 17, fontWeight: '700' },
  progress:     { flexDirection: 'row', paddingHorizontal: 40, paddingBottom: 14, position: 'relative' },
  progressDot:  { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: COLORS.red },
  progressLine: { position: 'absolute', top: 14, height: 2, backgroundColor: COLORS.gray200 },
  amountCard:   { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, gap: 6 },
  stepTitle:    { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  methodCard:   { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12, borderWidth: 2, borderColor: 'transparent' },
  methodCardActive: { borderColor: COLORS.red },
  radioOuter:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.gray300, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: COLORS.red },
  radioInner:   { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.red },
  nextBtn:      { backgroundColor: COLORS.red, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  nextBtnTxt:   { color: 'white', fontSize: 15, fontWeight: '700' },
  instructBox:  { borderRadius: 16, padding: 16, marginBottom: 12 },
  copyBtn:      { alignItems: 'center', paddingVertical: 12 },
  refBox:       { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  txInput:      { borderRadius: 14, padding: 16, fontSize: 16, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  doneTitle:    { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  doneSub:      { fontSize: 14, textAlign: 'center' },
  doneBtn:      { backgroundColor: COLORS.red, borderRadius: 16, padding: 16, paddingHorizontal: 40, marginTop: 16 },
});


// ============================================================
//  KIREEYE — BookingHistoryScreen.js
// ============================================================
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { query, collection, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { AppContext, COLORS } from '../../App';

export default function BookingHistoryScreen({ navigation }) {
  const { user, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.gray50, card: COLORS.white, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  if (loading) return <View style={[bh.center, { backgroundColor: C.bg }]}><ActivityIndicator color={COLORS.red} size="large" /></View>;

  return (
    <View style={[bh.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[bh.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: C.sub }}>←</Text>
        </TouchableOpacity>
        <Text style={[bh.title, { color: C.text }]}>{t('bookingHistory')}</Text>
        <View />
      </View>
      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        ListEmptyComponent={() => (
          <View style={bh.center}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏠</Text>
            <Text style={[{ color: C.sub, fontSize: 14 }]}>Wali booking ma jirto</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[bh.card, { backgroundColor: C.card }]}>
            <View style={bh.cardHeader}>
              <Text style={{ fontSize: 28 }}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[bh.cardTx, { color: C.text }]}>TX: {item.receipt?.receiptId || item.id.slice(0, 8)}</Text>
                <Text style={[bh.cardDate, { color: C.sub }]}>
                  {item.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                </Text>
              </View>
              <View style={bh.paidBadge}><Text style={bh.paidTxt}>✓ Bixiyay</Text></View>
            </View>
            <View style={[bh.divider, { backgroundColor: C.border }]} />
            <View style={bh.cardRow}>
              <Text style={[{ fontSize: 12, color: C.sub }]}>Hab:</Text>
              <Text style={[{ fontSize: 12, fontWeight: '600', color: C.text }]}>{item.method}</Text>
            </View>
            <View style={bh.cardRow}>
              <Text style={[{ fontSize: 12, color: C.sub }]}>Lacagta:</Text>
              <Text style={[{ fontSize: 14, fontWeight: '800', color: COLORS.red }]}>${item.amount}</Text>
            </View>
            {item.transactionId && (
              <View style={bh.cardRow}>
                <Text style={[{ fontSize: 12, color: C.sub }]}>Transaction ID:</Text>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: C.text }]}>{item.transactionId}</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const bh = StyleSheet.create({
  root:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:      { fontSize: 18, fontWeight: '800' },
  card:       { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTx:     { fontSize: 14, fontWeight: '700' },
  cardDate:   { fontSize: 11, marginTop: 2 },
  paidBadge:  { backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  paidTxt:    { fontSize: 11, fontWeight: '700', color: COLORS.green },
  divider:    { height: 1, marginBottom: 12 },
  cardRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
});


// ============================================================
//  KIREEYE — NotificationSettingsScreen.js
// ============================================================
import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateUserProfile } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

const NOTIF_ITEMS = [
  { key: 'chat',    icon: '💬', label: 'Farriimaaha Cusub' },
  { key: 'payment', icon: '💰', label: 'Lacag Bixinta' },
  { key: 'system',  icon: '⚙️', label: 'Ogeysiisyada Nidaamka' },
  { key: 'push',    icon: '📲', label: 'Push Notifications' },
  { key: 'sms',     icon: '📱', label: 'SMS' },
  { key: 'email',   icon: '📧', label: 'Email' },
];

export default function NotificationSettingsScreen({ navigation }) {
  const { user, profile, setProfile, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(profile?.notifSettings || {
    chat: true, payment: true, system: true, push: true, sms: true, email: true, doNotDisturb: false,
  });

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.gray50, card: COLORS.white, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  const toggle = async (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await updateUserProfile(user.uid, { notifSettings: updated });
    setProfile(p => ({ ...p, notifSettings: updated }));
  };

  return (
    <View style={[ns.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[ns.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: C.sub }}>←</Text>
        </TouchableOpacity>
        <Text style={[ns.title, { color: C.text }]}>🔔 Ogeysiisyada</Text>
        <View />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[ns.card, { backgroundColor: C.card }]}>
          {NOTIF_ITEMS.map((item, i) => (
            <View key={item.key} style={[ns.row, i < NOTIF_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <Text style={[ns.label, { color: C.text }]}>{item.label}</Text>
              <Switch
                value={settings[item.key] || false}
                onValueChange={v => toggle(item.key, v)}
                trackColor={{ false: COLORS.gray200, true: COLORS.red }}
                thumbColor="white"
              />
            </View>
          ))}
        </View>
        <View style={[ns.card, { backgroundColor: C.card, marginTop: 16 }]}>
          <View style={ns.row}>
            <Text style={{ fontSize: 22 }}>🌙</Text>
            <View style={{ flex: 1 }}>
              <Text style={[ns.label, { color: C.text }]}>Ha Digin (Do Not Disturb)</Text>
              <Text style={[{ fontSize: 11, color: C.sub, marginTop: 2 }]}>10:00 PM – 7:00 AM</Text>
            </View>
            <Switch
              value={settings.doNotDisturb || false}
              onValueChange={v => toggle('doNotDisturb', v)}
              trackColor={{ false: COLORS.gray200, true: COLORS.red }}
              thumbColor="white"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const ns = StyleSheet.create({
  root:   { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:  { fontSize: 18, fontWeight: '800' },
  card:   { borderRadius: 16, overflow: 'hidden' },
  row:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  label:  { flex: 1, fontSize: 14, fontWeight: '500' },
});


// ============================================================
//  KIREEYE — SecurityScreen.js
// ============================================================
import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';
import { updateUserProfile } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

export default function SecurityScreen({ navigation }) {
  const { user, profile, setProfile, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [sec, setSec] = useState(profile?.securitySettings || { twoFactorEnabled: false, biometricEnabled: false });

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.gray50, card: COLORS.white, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  const toggleBiometric = async (val) => {
    if (val) {
      const rnBiometrics = new ReactNativeBiometrics();
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) { Alert.alert('', 'Taleefankaagu biometric ma taageero'); return; }
      const { success } = await rnBiometrics.simplePrompt({ promptMessage: 'Xaqiiji biometric-kaaga' });
      if (!success) return;
    }
    const updated = { ...sec, biometricEnabled: val };
    setSec(updated);
    await updateUserProfile(user.uid, { securitySettings: updated });
  };

  const toggle2FA = async (val) => {
    const updated = { ...sec, twoFactorEnabled: val };
    setSec(updated);
    await updateUserProfile(user.uid, { securitySettings: updated });
    setProfile(p => ({ ...p, securitySettings: updated }));
  };

  const secItems = [
    { icon: '🔐', label: 'Two-Factor (2FA)', sub: 'OTP login kasta', key: 'twoFactorEnabled', toggle: toggle2FA },
    { icon: '👆', label: 'Biometric Login', sub: 'Touch ID / Face ID', key: 'biometricEnabled', toggle: toggleBiometric },
  ];

  return (
    <View style={[sc.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[sc.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: C.sub }}>←</Text>
        </TouchableOpacity>
        <Text style={[sc.title, { color: C.text }]}>🔒 Amniga Xisaabta</Text>
        <View />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[sc.card, { backgroundColor: C.card }]}>
          {secItems.map((item, i) => (
            <View key={item.key} style={[sc.row, i < secItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[sc.label, { color: C.text }]}>{item.label}</Text>
                <Text style={[{ fontSize: 11, color: C.sub, marginTop: 2 }]}>{item.sub}</Text>
              </View>
              <Switch
                value={sec[item.key] || false}
                onValueChange={item.toggle}
                trackColor={{ false: COLORS.gray200, true: COLORS.red }}
                thumbColor="white"
              />
            </View>
          ))}
        </View>
        <View style={[sc.card, { backgroundColor: C.card, marginTop: 16 }]}>
          {[
            { icon: '📱', label: 'Devices-ka Active', sub: 'Devices-kaaga la xukumo' },
            { icon: '🕐', label: 'Session History', sub: 'Login-yada hore arag' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[sc.row, i === 0 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
              <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[sc.label, { color: C.text }]}>{item.label}</Text>
                <Text style={[{ fontSize: 11, color: C.sub, marginTop: 2 }]}>{item.sub}</Text>
              </View>
              <Text style={{ color: C.sub, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const sc = StyleSheet.create({
  root:   { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title:  { fontSize: 18, fontWeight: '800' },
  card:   { borderRadius: 16, overflow: 'hidden' },
  row:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  label:  { fontSize: 14, fontWeight: '600' },
});


// ============================================================
//  KIREEYE — HelpCenterScreen.js  (AI-powered)
// ============================================================
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { submitHelpTicket, escalateToAdmin } from '../../services/reportVerifNotifService';
import { AppContext, COLORS } from '../../App';

const FAQ = [
  { q: 'Sideen lacagta u bixiyaa?', a: 'Heshiiska la gaadho kadib $3 ayaad ku bixisaa Zaad ama Somtel. App-ka ayaa kugu tilmaamaya.' },
  { q: 'Xisaabta la joojiyey maxaan sameeyaa?', a: 'Cabashada admin u soo gudbi Help Center-ka. 24 saac gudaheed ayaa la eegi doonaa.' },
  { q: 'Selfie-ga goormaad la ansixiyaa?', a: 'Admin ayaa 24 saac gudaheed eegaya. Email ayaad heli doontaa.' },
  { q: 'Qofka kiraynaya wuu been abuuraa sideen u sheegaa?', a: 'Profile-kiisa fur, "Report" riix, sababta kaga sheeg.' },
  { q: 'Lacagta dib miyaan u heli karaa?', a: 'Haddii problem jirto admin la xiriir Help Center-ka.' },
];

export default function HelpCenterScreen({ navigation }) {
  const { user, profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);

  const [messages, setMessages] = useState([
    { id: '0', role: 'ai', text: 'Salaam! 👋 Waxaan ahay AI-ga Kireeye. Sideen kaa caawin karaa?' }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  const C = darkMode
    ? { bg: COLORS.darkBg, header: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400 }
    : { bg: COLORS.gray50, header: COLORS.white, text: COLORS.black, sub: COLORS.gray600 };

  const addMsg = (role, text) => {
    const msg = { id: Date.now().toString(), role, text };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    return msg;
  };

  const handleFAQ = (item) => {
    addMsg('user', item.q);
    setTimeout(() => addMsg('ai', item.a), 600);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    addMsg('user', userMsg);
    setLoading(true);

    // Save ticket to Firestore
    if (!ticketId) {
      const id = await submitHelpTicket(user.uid, userMsg);
      setTicketId(id);
    }

    // Call Claude AI API
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: `Adiga waxaad tahay AI-ga Kireeye — app guryaha kirada ah ee Somaliland. 
Waxaad ku jawaabaysaa luqadda ay isticmaalaha adeegsanayaan (Soomaali, Ingiriisi, ama Carabi).
Jawaabo si gaaban, fudud, oo caawiso. 
Kireeye: $3 khidmad, labada qof bixiyaan. Payment: Zaad, Somtel, Waafi.
Haddii aad awood u lahayn: "Admin ayaan kuu xidhi doonaa" ku sheeg.`,
          messages: [
            ...messages.slice(1).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
            { role: 'user', content: userMsg },
          ],
        }),
      });
      const data = await res.json();
      const aiText = data.content?.[0]?.text || 'Waan ka xumahay, mar kale isku day.';
      addMsg('ai', aiText);

      // Check if AI can't help — escalate
      if (aiText.toLowerCase().includes('admin') || aiText.toLowerCase().includes('escalate')) {
        if (ticketId) await escalateToAdmin(ticketId);
      }
    } catch {
      addMsg('ai', 'Internet xiriirka eeg, kadibna mar kale isku day.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[hc.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[hc.header, { backgroundColor: C.header, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: COLORS.gray600 }}>←</Text>
        </TouchableOpacity>
        <View style={hc.headerInfo}>
          <Text style={{ fontSize: 24 }}>🤖</Text>
          <View>
            <Text style={[hc.headerName, { color: C.text }]}>Kireeye AI</Text>
            <Text style={{ fontSize: 11, color: COLORS.green }}>● Online</Text>
          </View>
        </View>
        <TouchableOpacity onPress={async () => {
          if (ticketId) await escalateToAdmin(ticketId);
          addMsg('ai', '✅ Admin-ka lagusula xidhay. Waxay kugula xiriiraan 24 saac gudaheed.');
        }}>
          <Text style={{ fontSize: 11, color: COLORS.red, fontWeight: '600' }}>{t('escalateToAdmin')}</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Chips */}
      {messages.length <= 2 && (
        <View style={{ padding: 12 }}>
          <Text style={[{ fontSize: 12, color: C.sub, marginBottom: 8 }]}>{t('commonQuestions')}</Text>
          <FlatList
            data={FAQ}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={hc.faqChip} onPress={() => handleFAQ(item)}>
                <Text style={hc.faqTxt}>{item.q}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[hc.msgWrap, item.role === 'user' ? hc.msgRight : hc.msgLeft]}>
            {item.role === 'ai' && <Text style={{ fontSize: 20 }}>🤖</Text>}
            <View style={[hc.bubble, item.role === 'user' ? hc.bubbleUser : [hc.bubbleAI, { backgroundColor: C.header }]]}>
              <Text style={[hc.bubbleTxt, { color: item.role === 'user' ? 'white' : C.text }]}>{item.text}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={() => loading ? (
          <View style={hc.msgLeft}>
            <Text style={{ fontSize: 20 }}>🤖</Text>
            <View style={[hc.bubble, hc.bubbleAI, { backgroundColor: C.header }]}>
              <ActivityIndicator color={COLORS.red} size="small" />
            </View>
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={[hc.inputBar, { backgroundColor: C.header, paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={[hc.input, { backgroundColor: C.bg, color: C.text }]}
          placeholder={t('helpPlaceholder')}
          placeholderTextColor={COLORS.gray400}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[hc.sendBtn, { opacity: input.trim() ? 1 : 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={{ fontSize: 16, color: 'white' }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const hc = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 15, fontWeight: '700' },
  faqChip:    { backgroundColor: COLORS.redSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, maxWidth: 200 },
  faqTxt:     { fontSize: 12, color: COLORS.red, fontWeight: '500' },
  msgWrap:    { flexDirection: 'row', gap: 8, maxWidth: '82%' },
  msgLeft:    { alignSelf: 'flex-start' },
  msgRight:   { alignSelf: 'flex-end' },
  bubble:     { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
  bubbleUser: { backgroundColor: COLORS.red, borderBottomRightRadius: 4 },
  bubbleAI:   { borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  bubbleTxt:  { fontSize: 14, lineHeight: 21 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  input:      { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn:    { width: 38, height: 38, backgroundColor: COLORS.red, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

