// ============================================================
//  KIREEYE — ProfileScreen.js
// ============================================================
import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Share, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logOut, deleteUserAccount } from '../../services/authService';
import { sendSOS } from '../../services/reportVerifNotifService';
import { AppContext, COLORS } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const { user, profile, setProfile, language, setLanguage, darkMode, setDarkMode, t } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.gray50, card: COLORS.white,    text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  const toggleDark = async (val) => {
    setDarkMode(val);
    await AsyncStorage.setItem('darkMode', String(val));
  };

  const handleLogout = () => {
    Alert.alert(t('signOut'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => logOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteUserAccount(user.uid) },
    ]);
  };

  const handleSOS = () => {
    Alert.alert(t('sosTitle'), t('sosDesc'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('sosSend'), style: 'destructive', onPress: async () => {
        await sendSOS(user.uid, null);
        Alert.alert('', t('sosSent'));
      }},
    ]);
  };

  const menuItems = [
    { icon: '🏠', label: profile?.totalRented ? `${t('bookingHistory')} (${profile.totalRented})` : t('bookingHistory'), color: COLORS.redSoft, nav: 'BookingHistory' },
    { icon: '🔔', label: t('notificationSettings'), color: '#F0FDF4', nav: 'NotifSettings' },
    { icon: '🔒', label: t('securitySettings'),      color: '#EFF6FF', nav: 'Security' },
    { icon: '❓', label: t('helpCenter'),             color: '#FFFBEB', nav: 'HelpCenter' },
    { icon: '📋', label: t('termsAndPrivacy'),        color: '#F5F3FF', nav: null },
    { icon: '🌍', label: t('language'),               color: COLORS.gray100, nav: null, right: language.toUpperCase() },
  ];

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          {profile?.isVerified && (
            <View style={s.verifiedDot}>
              <Text style={{ fontSize: 10, color: 'white' }}>✓</Text>
            </View>
          )}
        </View>
        <Text style={s.name}>{profile?.fullName || '—'}</Text>
        <Text style={s.phone}>{profile?.phone || ''}</Text>
        {profile?.trustBadge && (
          <View style={s.trustBadge}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
              🏆 {profile.trustBadge === 'trusted_tenant' ? t('trustedTenant') : t('topLandlord')}
            </Text>
          </View>
        )}
        <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>✏️ {t('editProfile')}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[s.stats, { backgroundColor: C.card }]}>
        <View style={s.statItem}>
          <Text style={s.statVal}>{profile?.totalRented || 0}</Text>
          <Text style={[s.statLbl, { color: C.sub }]}>{t('totalRented')}</Text>
        </View>
        <View style={[s.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border }]}>
          <Text style={s.statVal}>{profile?.rating || '—'}</Text>
          <Text style={[s.statLbl, { color: C.sub }]}>{t('rating')}</Text>
        </View>
        <View style={s.statItem}>
          <Text style={s.statVal}>{profile?.totalListings || 0}</Text>
          <Text style={[s.statLbl, { color: C.sub }]}>{t('myListings')}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Menu */}
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.menuItem, { backgroundColor: C.card }]}
            onPress={() => item.nav && navigation.navigate(item.nav)}
          >
            <View style={[s.menuIcon, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <Text style={[s.menuLabel, { color: C.text }]}>{item.label}</Text>
            {item.right
              ? <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 12 }}>{item.right}</Text>
              : <Text style={{ color: C.sub, fontSize: 18 }}>›</Text>
            }
          </TouchableOpacity>
        ))}

        {/* Dark Mode */}
        <View style={[s.menuItem, { backgroundColor: C.card }]}>
          <View style={[s.menuIcon, { backgroundColor: '#1F2937' }]}>
            <Text style={{ fontSize: 18 }}>🌙</Text>
          </View>
          <Text style={[s.menuLabel, { color: C.text }]}>{t('darkMode')}</Text>
          <Switch
            value={darkMode}
            onValueChange={toggleDark}
            trackColor={{ false: COLORS.gray200, true: COLORS.red }}
            thumbColor="white"
          />
        </View>

        {/* SOS */}
        <TouchableOpacity style={[s.sosBtn]} onPress={handleSOS}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>🆘 {t('sosTitle')}</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={[s.logoutBtn, { backgroundColor: C.card }]} onPress={handleLogout}>
          <Text style={{ color: COLORS.red, fontWeight: '600', fontSize: 14 }}>{t('signOut')}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity onPress={handleDeleteAccount} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: COLORS.gray400, fontSize: 12 }}>{t('deleteAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { backgroundColor: COLORS.red, alignItems: 'center', paddingBottom: 24, paddingHorizontal: 20 },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  verifiedDot:{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, backgroundColor: COLORS.green, borderRadius: 12, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  name:       { color: 'white', fontSize: 19, fontWeight: '700' },
  phone:      { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 },
  trustBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  editBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginTop: 12 },
  stats:      { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 14, marginTop: -16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  statItem:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 20, fontWeight: '800', color: COLORS.black },
  statLbl:    { fontSize: 10, marginTop: 3 },
  menuItem:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  menuIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel:  { flex: 1, fontSize: 14, fontWeight: '500' },
  sosBtn:     { backgroundColor: '#DC2626', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  logoutBtn:  { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 4 },
});


// ============================================================
//  KIREEYE — AdminDashboard.js
// ============================================================
import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import {
  collection, query, orderBy, limit, onSnapshot,
  where, getDocs, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext, COLORS } from '../../App';

const { width } = Dimensions.get('window');
const DAYS = ['Axd', 'Isn', 'Sal', 'Arb', 'Kha', 'Jim', 'Sab'];

export function AdminDashboard({ navigation }) {
  const { t } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [stats,        setStats]        = useState({ users: 0, listings: 0, deals: 0, revenue: 0 });
  const [recentDeals,  setRecentDeals]  = useState([]);
  const [pendingVerif, setPendingVerif] = useState([]);
  const [reports,      setReports]      = useState([]);
  const [weekRevenue,  setWeekRevenue]  = useState([0,0,0,0,0,0,0]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    loadStats();
    const unsubDeals = listenDeals();
    const unsubVerif = listenVerifications();
    const unsubRep   = listenReports();
    return () => { unsubDeals(); unsubVerif(); unsubRep(); };
  }, []);

  const loadStats = async () => {
    try {
      const [uSnap, lSnap, tSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'listings'), where('status', '==', 'available'))),
        getDocs(query(collection(db, 'transactions'), where('status', '==', 'completed'), orderBy('createdAt', 'desc'), limit(100))),
      ]);

      const today = new Date(); today.setHours(0,0,0,0);
      const todayTx = tSnap.docs.filter(d => d.data().createdAt?.toDate() >= today);

      // Week revenue chart
      const rev = [0,0,0,0,0,0,0];
      tSnap.docs.forEach(d => {
        const date = d.data().createdAt?.toDate();
        if (!date) return;
        const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (daysAgo < 7) rev[6 - daysAgo] += d.data().amount || 0;
      });

      setStats({
        users:   uSnap.data().count,
        listings: lSnap.data().count,
        deals:   todayTx.length,
        revenue: todayTx.reduce((a, d) => a + (d.data().amount || 0), 0),
      });
      setWeekRevenue(rev);
    } catch (e) {}
    setLoading(false);
  };

  const listenDeals = () => {
    const q = query(collection(db, 'transactions'), where('status', '==', 'completed'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, snap => setRecentDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const listenVerifications = () => {
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'), limit(10));
    return onSnapshot(q, snap => setPendingVerif(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const listenReports = () => {
    const q = query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, snap => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  };

  const maxRev = Math.max(...weekRevenue, 1);

  if (loading) return <View style={[as.center]}><ActivityIndicator color={COLORS.red} size="large" /></View>;

  return (
    <View style={[as.root, { paddingTop: insets.top }]}>
      <View style={as.header}>
        <Text style={as.title}>⚙️ Kireeye Admin</Text>
        <View style={as.liveBadge}><Text style={as.liveTxt}>LIVE</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {/* Stats Grid */}
        <View style={as.grid}>
          {[
            { icon: '💰', val: `$${stats.revenue}`, lbl: t('todayRevenue'), hi: true },
            { icon: '👥', val: stats.users,          lbl: t('totalUsers') },
            { icon: '🏠', val: stats.listings,       lbl: t('activeListings') },
            { icon: '🤝', val: stats.deals,           lbl: t('todayDeals') },
          ].map((s, i) => (
            <View key={i} style={[as.statCard, s.hi && as.statCardHi]}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</Text>
              <Text style={[as.statVal, s.hi && { color: 'white' }]}>{s.val}</Text>
              <Text style={[as.statLbl, s.hi && { color: 'rgba(255,255,255,0.7)' }]}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Chart */}
        <View style={as.card}>
          <Text style={as.cardTitle}>📊 Revenue — Toddobaadkan</Text>
          <View style={as.chartArea}>
            {weekRevenue.map((v, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 80 }}>
                <View style={[as.bar, { height: `${Math.max(8, (v / maxRev) * 100)}%`, backgroundColor: i === 5 ? COLORS.red : COLORS.redSoft }]} />
                <Text style={as.dayLabel}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pending Verifications */}
        {pendingVerif.length > 0 && (
          <View style={as.card}>
            <Text style={as.cardTitle}>🔍 {t('pendingVerifications')} ({pendingVerif.length})</Text>
            {pendingVerif.map(u => (
              <View key={u.id} style={as.row}>
                <Text style={{ fontSize: 22 }}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={as.rowName}>{u.fullName}</Text>
                  <Text style={as.rowSub}>{u.phone}</Text>
                </View>
                <TouchableOpacity style={as.approveBtn}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{t('approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={as.rejectBtn}>
                  <Text style={{ color: COLORS.red, fontSize: 11, fontWeight: '700' }}>{t('reject')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Reports */}
        {reports.length > 0 && (
          <View style={as.card}>
            <Text style={as.cardTitle}>⚠️ {t('reports')} ({reports.length})</Text>
            {reports.map(r => (
              <View key={r.id} style={as.row}>
                <Text style={{ fontSize: 22 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={as.rowName}>{r.reason}</Text>
                  <Text style={as.rowSub}>{r.targetType} — {r.details?.slice(0, 40)}</Text>
                </View>
                <TouchableOpacity style={as.approveBtn}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{t('ban')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recent Deals */}
        <View style={as.card}>
          <Text style={as.cardTitle}>⚡ {t('recentDeals')}</Text>
          {recentDeals.slice(0, 8).map(tx => (
            <View key={tx.id} style={as.row}>
              <Text style={{ fontSize: 22 }}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={as.rowName}>TX: {tx.id.slice(0, 8)}</Text>
                <Text style={as.rowSub}>{tx.method} · {new Date(tx.createdAt?.toDate()).toLocaleTimeString()}</Text>
              </View>
              <Text style={as.rowAmount}>+${tx.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const as = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.black },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.black },
  title:      { color: 'white', fontSize: 16, fontWeight: '700' },
  liveBadge:  { backgroundColor: COLORS.red, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  liveTxt:    { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard:   { width: (width - 38) / 2, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14 },
  statCardHi: { backgroundColor: COLORS.red },
  statVal:    { fontSize: 22, fontWeight: '800', color: 'white' },
  statLbl:    { fontSize: 10, color: COLORS.gray400, marginTop: 3 },
  card:       { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14, marginBottom: 14 },
  cardTitle:  { fontSize: 12, fontWeight: '700', color: 'white', marginBottom: 12 },
  chartArea:  { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 6 },
  bar:        { width: '100%', borderRadius: 4 },
  dayLabel:   { color: COLORS.gray400, fontSize: 8, marginTop: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  rowName:    { fontSize: 12, fontWeight: '600', color: 'white' },
  rowSub:     { fontSize: 10, color: COLORS.gray400, marginTop: 1 },
  rowAmount:  { fontSize: 13, fontWeight: '700', color: COLORS.green },
  approveBtn: { backgroundColor: COLORS.green, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  rejectBtn:  { backgroundColor: COLORS.redSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
});

