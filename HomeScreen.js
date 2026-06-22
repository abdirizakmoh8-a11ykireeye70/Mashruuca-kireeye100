// ============================================================
//  KIREEYE — HomeScreen.js
// ============================================================
import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ScrollView, Image,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listenToListings } from '../../services/listingService';
import { AppContext, COLORS } from '../../App';

const { width } = Dimensions.get('window');

const CITIES = ['Hargaysa', 'Burco', 'Berbera', 'Borama', 'Ceerigaavo'];
const TYPES  = ['house', 'apartment', 'room', 'villa'];

export default function HomeScreen({ navigation }) {
  const { profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [listings,    setListings]    = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [activeCity,  setActiveCity]  = useState('');
  const [activeType,  setActiveType]  = useState('');

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.gray50,  card: COLORS.white,    text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  useEffect(() => {
    const unsub = listenToListings((data) => {
      setListings(data);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let data = [...listings];
    if (search)     data = data.filter(l => l.title?.toLowerCase().includes(search.toLowerCase()) || l.district?.toLowerCase().includes(search.toLowerCase()));
    if (activeCity) data = data.filter(l => l.city === activeCity);
    if (activeType) data = data.filter(l => l.type === activeType);
    setFiltered(data);
  }, [listings, search, activeCity, activeType]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const statusColor  = { available: COLORS.green, rented: COLORS.red, pending: COLORS.yellow };
  const statusLabel  = { available: '🟢', rented: '🔴', pending: '🟡' };
  const typeEmoji    = { house: '🏡', apartment: '🏢', room: '🛏', villa: '🏰' };

  const renderListing = useCallback(({ item }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: C.card }]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ListingDetail', { listing: item })}
    >
      {/* Image */}
      <View style={s.cardImg}>
        {item.images?.[0]
          ? <Image source={{ uri: item.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Text style={s.cardEmoji}>{typeEmoji[item.type] || '🏠'}</Text>
        }
        <View style={[s.statusBadge, { backgroundColor: statusColor[item.status] + '22' }]}>
          <Text style={[s.statusText, { color: statusColor[item.status] }]}>
            {statusLabel[item.status]} {item.status === 'available' ? t('available') : item.status === 'rented' ? t('rented') : t('pending')}
          </Text>
        </View>
        {item.isFeatured && (
          <View style={s.featuredBadge}>
            <Text style={s.featuredText}>⭐ Featured</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <Text style={[s.cardTitle, { color: C.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[s.cardLoc, { color: C.sub }]}>📍 {item.district}, {item.city}</Text>
        <View style={s.cardBottom}>
          <View>
            <Text style={s.cardPrice}>${item.price}<Text style={s.cardPriceSub}>{t('perMonth')}</Text></Text>
            <View style={s.cardMeta}>
              <Text style={[s.cardMetaItem, { color: C.sub }]}>🛏 {item.rooms}</Text>
              <Text style={[s.cardMetaItem, { color: C.sub }]}>🚿 {item.bathrooms}</Text>
              <Text style={[s.cardMetaItem, { color: C.sub }]}>📐 {item.area}m²</Text>
            </View>
          </View>
          {item.isVerifiedByAI && (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedText}>✓ {t('verified')}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [C, t]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={COLORS.red} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{getGreeting()} 👋</Text>
            <Text style={s.userName}>{profile?.fullName || 'Ku soo dhawoow'}</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('NotifSettings')}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>
        {/* Search */}
        <View style={s.searchBar}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={COLORS.gray400}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ fontSize: 16, color: COLORS.gray400 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderListing}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            tintColor={COLORS.red}
          />
        }
        ListHeaderComponent={() => (
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            {/* City Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {['', ...CITIES].map(city => (
                <TouchableOpacity
                  key={city}
                  style={[s.chip, activeCity === city && s.chipActive]}
                  onPress={() => setActiveCity(city)}
                >
                  <Text style={[s.chipText, activeCity === city && s.chipTextActive]}>
                    {city || t('all')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Type Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {['', ...TYPES].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[s.chip, activeType === type && s.chipActive]}
                  onPress={() => setActiveType(type)}
                >
                  <Text style={[s.chipText, activeType === type && s.chipTextActive]}>
                    {type ? (typeEmoji[type] + ' ' + t(type)) : t('all')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: C.text }]}>{t('newListings')}</Text>
              <Text style={s.seeAll}>{filtered.length} listing</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🏠</Text>
            <Text style={[s.emptyText, { color: C.sub }]}>Wax listing ah lama helin</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:     { backgroundColor: COLORS.red, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  greeting:   { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  userName:   { color: 'white', fontSize: 17, fontWeight: '700' },
  notifBtn:   { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  searchBar:  { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput:{ flex: 1, fontSize: 13, color: COLORS.black, padding: 0 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.gray200, backgroundColor: 'white', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  chipText:   { fontSize: 12, fontWeight: '500', color: COLORS.gray600 },
  chipTextActive: { color: 'white' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  seeAll:        { fontSize: 12, color: COLORS.red, fontWeight: '600' },
  card:       { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardImg:    { height: 160, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  cardEmoji:  { fontSize: 56 },
  statusBadge:{ position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  featuredBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  featuredText:  { color: 'white', fontSize: 10, fontWeight: '700' },
  cardBody:   { padding: 14 },
  cardTitle:  { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardLoc:    { fontSize: 11, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardPrice:  { fontSize: 18, fontWeight: '800', color: COLORS.red },
  cardPriceSub: { fontSize: 11, fontWeight: '400', color: COLORS.gray400 },
  cardMeta:   { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardMetaItem: { fontSize: 11 },
  verifiedBadge: { backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  verifiedText:  { fontSize: 10, fontWeight: '700', color: COLORS.green },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:  { fontSize: 14 },
});

