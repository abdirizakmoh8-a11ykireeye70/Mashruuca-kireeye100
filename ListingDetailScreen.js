// ============================================================
//  KIREEYE — ListingDetailScreen.js
// ============================================================
import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Alert, Share, FlatList, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getListing, getSimilarListings, incrementShare,
} from '../../services/listingService';
import { submitReport } from '../../services/reportVerifNotifService';
import { getOrCreateChat } from '../../services/chatService';
import { getUserProfile } from '../../services/authService';
import { AppContext, COLORS } from '../../App';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { listing: initialListing } = route.params;
  const { user, profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [listing,  setListing]  = useState(initialListing);
  const [owner,    setOwner]    = useState(null);
  const [similar,  setSimilar]  = useState([]);
  const [imgIndex, setImgIndex] = useState(0);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.white, card: COLORS.gray50, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray100 };

  const statusColor = { available: COLORS.green, rented: COLORS.red, pending: COLORS.yellow };
  const typeEmoji   = { house: '🏡', apartment: '🏢', room: '🛏', villa: '🏰' };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fresh, ownerData, sim] = await Promise.all([
      getListing(listing.id),
      getUserProfile(listing.ownerId),
      getSimilarListings(listing),
    ]);
    if (fresh) setListing(fresh);
    setOwner(ownerData);
    setSimilar(sim);
  };

  const handleChat = async () => {
    if (listing.ownerId === user.uid) {
      Alert.alert('', 'Gurigaaga kama hadli kartid');
      return;
    }
    const chatId = await getOrCreateChat(user.uid, listing.ownerId, listing.id);
    navigation.navigate('Chat', { chatId, otherUser: owner, listing });
  };

  const handleShare = async () => {
    await incrementShare(listing.id);
    await Share.share({
      message: `🏠 ${listing.title}\n📍 ${listing.district}, ${listing.city}\n💰 $${listing.price}/bil\n\nKireeye App ku soo dajiso si aad u aragtid`,
      title: listing.title,
    });
  };

  const handleReport = () => {
    Alert.alert(t('report'), '', [
      { text: 'Macluumaad been ah', onPress: () => doReport('Macluumaad been ah') },
      { text: 'Sawirro been abuur', onPress: () => doReport('Sawirro been abuur') },
      { text: 'Qiime khalad',       onPress: () => doReport('Qiime khalad') },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const doReport = async (reason) => {
    await submitReport({
      reporterId: user.uid,
      targetId: listing.id,
      targetType: 'listing',
      reason,
      details: listing.title,
    });
    Alert.alert('', t('reportReceived'));
  };

  return (
    <View style={[ld.root, { backgroundColor: C.bg }]}>
      {/* Image Gallery */}
      <View style={ld.gallery}>
        <FlatList
          data={listing.images?.length ? listing.images : ['placeholder']}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => i.toString()}
          onMomentumScrollEnd={e => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height: 260, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' }}>
              {item === 'placeholder'
                ? <Text style={{ fontSize: 80 }}>{typeEmoji[listing.type] || '🏠'}</Text>
                : <Image source={{ uri: item }} style={{ width, height: 260 }} resizeMode="cover" />
              }
            </View>
          )}
        />
        {/* Photo counter */}
        {listing.images?.length > 1 && (
          <View style={ld.photoCount}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>
              📷 {imgIndex + 1}/{listing.images.length}
            </Text>
          </View>
        )}
        {/* Back button */}
        <TouchableOpacity style={[ld.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        {/* Share button */}
        <TouchableOpacity style={[ld.shareBtn, { top: insets.top + 8 }]} onPress={handleShare}>
          <Text style={{ fontSize: 16 }}>📤</Text>
        </TouchableOpacity>
        {/* Status badge */}
        <View style={[ld.statusBadge, { backgroundColor: statusColor[listing.status] + '22' }]}>
          <Text style={[ld.statusTxt, { color: statusColor[listing.status] }]}>
            {listing.status === 'available' ? '🟢 ' + t('available') :
             listing.status === 'rented'    ? '🔴 ' + t('rented') : '🟡 ' + t('pending')}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ padding: 16 }}>
          {/* Title & Price */}
          <View style={ld.titleRow}>
            <Text style={[ld.title, { color: C.text }]} numberOfLines={2}>{listing.title}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={ld.price}>${listing.price}</Text>
              <Text style={{ fontSize: 10, color: C.sub }}>{t('perMonth')}</Text>
            </View>
          </View>

          {/* Location */}
          <Text style={[ld.loc, { color: C.sub }]}>📍 {listing.district}, {listing.city}</Text>

          {/* Features */}
          <View style={ld.features}>
            {[
              { icon: '🛏', val: listing.rooms,     lbl: t('listingRooms') },
              { icon: '🚿', val: listing.bathrooms,  lbl: t('listingBaths') },
              { icon: '📐', val: listing.area + 'm²', lbl: t('listingArea') },
              { icon: '🏠', val: t(listing.type),    lbl: t('listingType') },
            ].map((f, i) => (
              <View key={i} style={[ld.featPill, { backgroundColor: C.card }]}>
                <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                <Text style={[ld.featVal, { color: C.text }]}>{f.val}</Text>
                <Text style={[ld.featLbl, { color: C.sub }]}>{f.lbl}</Text>
              </View>
            ))}
          </View>

          {/* Amenities */}
          <View style={ld.amenities}>
            {listing.hasGarage     && <View style={ld.amenityTag}><Text style={ld.amenityTxt}>🚗 Garaash</Text></View>}
            {listing.hasWater      && <View style={ld.amenityTag}><Text style={ld.amenityTxt}>💧 Biyo</Text></View>}
            {listing.hasElectricity && <View style={ld.amenityTag}><Text style={ld.amenityTxt}>⚡ Korontada</Text></View>}
            {listing.hasInternet   && <View style={ld.amenityTag}><Text style={ld.amenityTxt}>🌐 Internet</Text></View>}
          </View>

          {/* Description */}
          {listing.description && (
            <>
              <Text style={[ld.sectionTitle, { color: C.text }]}>📄 Faahfaahinta</Text>
              <Text style={[ld.desc, { color: C.sub }]}>{listing.description}</Text>
            </>
          )}

          {/* Map Placeholder */}
          <Text style={[ld.sectionTitle, { color: C.text }]}>📍 {t('addLocation')}</Text>
          <TouchableOpacity
            style={ld.mapBox}
            onPress={() => {
              if (listing.location) {
                Linking.openURL(`https://maps.google.com/?q=${listing.location.lat},${listing.location.lng}`);
              }
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 6 }}>🗺️</Text>
            <Text style={{ fontSize: 12, color: COLORS.gray600 }}>{listing.district}, {listing.city}</Text>
            <Text style={{ fontSize: 11, color: COLORS.red, marginTop: 4, fontWeight: '600' }}>Google Maps ku Fur →</Text>
          </TouchableOpacity>

          {/* Owner Card */}
          {owner && (
            <>
              <Text style={[ld.sectionTitle, { color: C.text }]}>👤 {t('owner')}</Text>
              <View style={[ld.ownerCard, { backgroundColor: C.card }]}>
                <View style={ld.ownerAvatar}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                  {owner.isVerified && (
                    <View style={ld.verifiedDot}><Text style={{ fontSize: 8, color: 'white' }}>✓</Text></View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ld.ownerName, { color: C.text }]}>{owner.fullName}</Text>
                  <Text style={[ld.ownerStats, { color: C.sub }]}>
                    {owner.totalListings || 0} {t('totalListings')} · {owner.rating || '—'} ⭐
                  </Text>
                  {owner.trustBadge && (
                    <Text style={ld.trustBadge}>🏆 {owner.trustBadge === 'top_landlord' ? t('topLandlord') : t('trustedTenant')}</Text>
                  )}
                </View>
                <Text style={{ color: COLORS.yellow, fontSize: 16, fontWeight: '700' }}>⭐ {owner.rating || '—'}</Text>
              </View>
            </>
          )}

          {/* View Count */}
          <Text style={[ld.viewCount, { color: C.sub }]}>👁 {listing.viewCount || 0} {t('viewsCount')}</Text>

          {/* Similar Listings */}
          {similar.length > 0 && (
            <>
              <Text style={[ld.sectionTitle, { color: C.text }]}>🏠 {t('similarListings')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                {similar.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[ld.simCard, { backgroundColor: C.card }]}
                    onPress={() => navigation.push('ListingDetail', { listing: s })}
                  >
                    <View style={ld.simImg}>
                      {s.images?.[0]
                        ? <Image source={{ uri: s.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        : <Text style={{ fontSize: 30 }}>{typeEmoji[s.type] || '🏠'}</Text>
                      }
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text style={[{ fontSize: 12, fontWeight: '700', color: C.text }]} numberOfLines={1}>{s.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.red, marginTop: 3 }}>${s.price}<Text style={{ fontSize: 10, fontWeight: '400', color: C.sub }}>/bil</Text></Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Report */}
          <TouchableOpacity onPress={handleReport} style={ld.reportBtn}>
            <Text style={{ color: COLORS.gray400, fontSize: 12 }}>⚠️ {t('report')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CTA Buttons */}
      {listing.ownerId !== user.uid && listing.status === 'available' && (
        <View style={[ld.cta, { paddingBottom: insets.bottom + 12, backgroundColor: C.bg, borderTopColor: C.border }]}>
          <TouchableOpacity style={ld.chatBtn} onPress={handleChat}>
            <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 14 }}>💬 {t('startChat')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ld.bookBtn} onPress={handleChat}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>🤝 {t('bookNow')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const ld = StyleSheet.create({
  root:        { flex: 1 },
  gallery:     { position: 'relative' },
  photoCount:  { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  backBtn:     { position: 'absolute', left: 12, width: 36, height: 36, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  shareBtn:    { position: 'absolute', right: 12, width: 36, height: 36, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  statusBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  titleRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  title:       { flex: 1, fontSize: 20, fontWeight: '800', lineHeight: 26 },
  price:       { fontSize: 22, fontWeight: '800', color: COLORS.red },
  loc:         { fontSize: 13, marginBottom: 16 },
  features:    { flexDirection: 'row', gap: 8, marginBottom: 14 },
  featPill:    { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  featVal:     { fontSize: 14, fontWeight: '700' },
  featLbl:     { fontSize: 9 },
  amenities:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  amenityTag:  { backgroundColor: COLORS.redSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  amenityTxt:  { fontSize: 12, color: COLORS.red, fontWeight: '500' },
  sectionTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  desc:        { fontSize: 13, lineHeight: 21, marginBottom: 4 },
  mapBox:      { height: 110, backgroundColor: COLORS.gray100, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: 'dashed', marginBottom: 4 },
  ownerCard:   { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  ownerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  verifiedDot: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, backgroundColor: COLORS.green, borderRadius: 9, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  ownerName:   { fontSize: 14, fontWeight: '700' },
  ownerStats:  { fontSize: 11, marginTop: 3 },
  trustBadge:  { fontSize: 10, color: COLORS.yellow, fontWeight: '600', marginTop: 3 },
  viewCount:   { fontSize: 11, textAlign: 'right', marginTop: 8, marginBottom: 4 },
  simCard:     { width: 160, borderRadius: 14, overflow: 'hidden', marginRight: 12, elevation: 2 },
  simImg:      { height: 100, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  reportBtn:   { alignItems: 'center', paddingVertical: 16, marginTop: 12 },
  cta:         { flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: 1 },
  chatBtn:     { flex: 1, backgroundColor: COLORS.redSoft, borderRadius: 14, padding: 14, alignItems: 'center' },
  bookBtn:     { flex: 2, backgroundColor: COLORS.red, borderRadius: 14, padding: 14, alignItems: 'center' },
});


// ============================================================
//  KIREEYE — AddListingScreen.js
// ============================================================
import React, { useContext, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createListing } from '../../services/listingService';
import { AppContext, COLORS } from '../../App';

const CITIES = ['Hargaysa', 'Burco', 'Berbera', 'Borama', 'Ceerigaavo'];
const TYPES  = [
  { key: 'house',     label: '🏡 Guri' },
  { key: 'apartment', label: '🏢 Apartment' },
  { key: 'room',      label: '🛏 Qol' },
  { key: 'villa',     label: '🏰 Fillo' },
];

export default function AddListingScreen({ navigation }) {
  const { user, profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    title: '', description: '', price: '',
    rooms: '1', bathrooms: '1', area: '',
    city: 'Hargaysa', district: '',
    type: 'house',
    hasGarage: false, hasWater: true, hasElectricity: true, hasInternet: false,
  });
  const [images,  setImages]  = useState([]);
  const [loading, setLoading] = useState(false);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder, input: COLORS.darkBorder }
    : { bg: COLORS.gray50,  card: COLORS.white,    text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray200,   input: COLORS.gray50 };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const pickImages = async () => {
    if (images.length >= 6) { Alert.alert('', '6 sawir oo kaliya'); return; }
    const res = await launchImageLibrary({
      mediaType: 'photo', selectionLimit: 6 - images.length, quality: 0.8,
    });
    if (res.assets) {
      setImages(prev => [...prev, ...res.assets.map(a => a)].slice(0, 6));
    }
  };

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.district) {
      Alert.alert('', 'Dhammaan meelaha muhiimka ah buuxi'); return;
    }
    if (images.length === 0) {
      Alert.alert('', 'Ugu yaraan 1 sawir kudar'); return;
    }
    if (!profile?.isVerified) {
      Alert.alert('', 'Xisaabta si hore u xaqiiji'); return;
    }
    setLoading(true);
    try {
      const blobs = await Promise.all(images.map(async img => {
        const res = await fetch(img.uri);
        return res.blob();
      }));
      await createListing(user.uid, form, blobs);
      Alert.alert('✅', 'Listing-ka si guul leh ayaa la soo daabacay!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('error'), e.message || t('networkError'));
    }
    setLoading(false);
  };

  const InputField = ({ label, field, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={[al.label, { color: C.sub }]}>{label}</Text>
      <TextInput
        style={[al.input, { backgroundColor: C.input, color: C.text, borderColor: C.border, height: multiline ? 90 : 46 }]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray400}
        value={form[field]}
        onChangeText={v => set(field, v)}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[al.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[al.header, { paddingTop: insets.top + 12, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: C.sub }}>✕</Text>
        </TouchableOpacity>
        <Text style={[al.headerTitle, { color: C.text }]}>{t('addListing')}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.red} />
            : <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 15 }}>{t('publishListing')}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Images */}
        <Text style={[al.label, { color: C.sub }]}>{t('addPhotos')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {images.map((img, i) => (
            <View key={i} style={al.imgThumb}>
              <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <TouchableOpacity style={al.removeImg} onPress={() => removeImage(i)}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
              {i === 0 && <View style={al.mainImgBadge}><Text style={{ color: 'white', fontSize: 9 }}>Main</Text></View>}
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity style={[al.addImgBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={pickImages}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={[{ fontSize: 11, color: C.sub, marginTop: 6 }]}>{images.length}/6</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Type Selector */}
        <Text style={[al.label, { color: C.sub }]}>{t('listingType')}</Text>
        <View style={al.typeRow}>
          {TYPES.map(tp => (
            <TouchableOpacity
              key={tp.key}
              style={[al.typeBtn, { backgroundColor: C.card, borderColor: form.type === tp.key ? COLORS.red : C.border },
                form.type === tp.key && { backgroundColor: COLORS.redSoft }]}
              onPress={() => set('type', tp.key)}
            >
              <Text style={[al.typeTxt, { color: form.type === tp.key ? COLORS.red : C.sub }]}>{tp.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <InputField label={t('listingTitle')}   field="title"       placeholder="Guri qurxoon 3 qol ah..." />
        <InputField label={t('listingDesc')}    field="description" placeholder="Faahfaahinta guriga..." multiline />
        <InputField label={t('listingPrice')}   field="price"       placeholder="150" keyboardType="numeric" />

        <View style={al.row}>
          <View style={{ flex: 1 }}>
            <InputField label={t('listingRooms')}  field="rooms"      placeholder="3" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label={t('listingBaths')}  field="bathrooms"  placeholder="2" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label={t('listingArea')}   field="area"       placeholder="120" keyboardType="numeric" />
          </View>
        </View>

        {/* City */}
        <Text style={[al.label, { color: C.sub }]}>{t('listingCity')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {CITIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[al.cityChip, { borderColor: form.city === c ? COLORS.red : C.border },
                form.city === c && { backgroundColor: COLORS.redSoft }]}
              onPress={() => set('city', c)}
            >
              <Text style={[{ fontSize: 12, fontWeight: '600', color: form.city === c ? COLORS.red : C.sub }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <InputField label={t('listingDistrict')} field="district" placeholder="Jigjiga Yar, Sha'ab..." />

        {/* Amenities */}
        <Text style={[al.label, { color: C.sub }]}>Xaaladaha Guriga</Text>
        <View style={[al.amenCard, { backgroundColor: C.card }]}>
          {[
            { key: 'hasGarage',      icon: '🚗', label: 'Garaash' },
            { key: 'hasWater',       icon: '💧', label: 'Biyo' },
            { key: 'hasElectricity', icon: '⚡', label: 'Koronto' },
            { key: 'hasInternet',    icon: '🌐', label: 'Internet' },
          ].map(a => (
            <View key={a.key} style={al.amenRow}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              <Text style={[{ flex: 1, fontSize: 14, color: C.text }]}>{a.label}</Text>
              <Switch
                value={form[a.key]}
                onValueChange={v => set(a.key, v)}
                trackColor={{ false: COLORS.gray200, true: COLORS.red }}
                thumbColor="white"
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[al.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>🚀 {t('publishListing')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const al = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  label:       { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input:       { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 14, marginBottom: 0 },
  row:         { flexDirection: 'row', gap: 10 },
  imgThumb:    { width: 100, height: 100, borderRadius: 12, overflow: 'hidden', marginRight: 10, position: 'relative' },
  removeImg:   { position: 'absolute', top: 4, right: 4, width: 22, height: 22, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mainImgBadge:{ position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  addImgBtn:   { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  typeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeBtn:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, flex: 1, alignItems: 'center' },
  typeTxt:     { fontSize: 12, fontWeight: '600' },
  cityChip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  amenCard:    { borderRadius: 16, padding: 4, marginBottom: 20 },
  amenRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  submitBtn:   { backgroundColor: COLORS.red, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
});


// ============================================================
//  KIREEYE — SearchScreen.js
// ============================================================
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getListings } from '../../services/listingService';
import { AppContext, COLORS } from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRICE_RANGES = [
  { label: 'Dhammaan', min: null, max: null },
  { label: '$0–100',   min: 0,    max: 100 },
  { label: '$100–200', min: 100,  max: 200 },
  { label: '$200–400', min: 200,  max: 400 },
  { label: '$400+',    min: 400,  max: null },
];

export default function SearchScreen({ navigation }) {
  const { t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [history,  setHistory]  = useState([]);
  const [priceRange, setPriceRange] = useState(0);
  const [minRooms, setMinRooms] = useState(null);
  const [searched, setSearched] = useState(false);

  const C = darkMode
    ? { bg: COLORS.darkBg, card: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, border: COLORS.darkBorder }
    : { bg: COLORS.white, card: COLORS.gray50, text: COLORS.black, sub: COLORS.gray600, border: COLORS.gray200 };

  useEffect(() => {
    AsyncStorage.getItem('searchHistory').then(h => {
      if (h) setHistory(JSON.parse(h));
    });
  }, []);

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);

    // Save search history
    const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 8);
    setHistory(newHistory);
    await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));

    const range = PRICE_RANGES[priceRange];
    const { listings } = await getListings({
      minPrice: range.min, maxPrice: range.max,
      minRooms,
    });

    // Client-side text filter
    const filtered = listings.filter(l =>
      l.title?.toLowerCase().includes(q.toLowerCase()) ||
      l.district?.toLowerCase().includes(q.toLowerCase()) ||
      l.city?.toLowerCase().includes(q.toLowerCase()) ||
      l.type?.toLowerCase().includes(q.toLowerCase())
    );
    setResults(filtered);
    setLoading(false);
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem('searchHistory');
  };

  const typeEmoji = { house: '🏡', apartment: '🏢', room: '🛏', villa: '🏰' };

  return (
    <View style={[sr.root, { backgroundColor: C.bg, paddingTop: insets.top + 10 }]}>
      {/* Search Bar */}
      <View style={[sr.searchRow, { paddingHorizontal: 16 }]}>
        <View style={[sr.searchBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            style={[sr.input, { color: C.text }]}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={COLORS.gray400}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); }}>
              <Text style={{ fontSize: 16, color: COLORS.gray400 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => handleSearch()} style={sr.searchBtn}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{t('search')}</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {PRICE_RANGES.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[sr.chip, priceRange === i && sr.chipActive]}
              onPress={() => setPriceRange(i)}
            >
              <Text style={[sr.chipTxt, priceRange === i && { color: 'white' }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[null, 1, 2, 3, 4].map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[sr.chip, minRooms === r && sr.chipActive]}
              onPress={() => setMinRooms(r)}
            >
              <Text style={[sr.chipTxt, minRooms === r && { color: 'white' }]}>
                {r === null ? 'Qol kasta' : `${r}+ Qol`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* History or Results */}
      {!searched ? (
        <View style={{ padding: 16 }}>
          {history.length > 0 && (
            <>
              <View style={sr.histHeader}>
                <Text style={[{ fontSize: 14, fontWeight: '700', color: C.text }]}>🕐 {t('recentlyViewed')}</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={{ color: COLORS.red, fontSize: 12 }}>{t('delete')}</Text>
                </TouchableOpacity>
              </View>
              {history.map((h, i) => (
                <TouchableOpacity key={i} style={sr.histItem} onPress={() => { setQuery(h); handleSearch(h); }}>
                  <Text style={{ fontSize: 16 }}>🔍</Text>
                  <Text style={[{ flex: 1, fontSize: 14, color: C.text }]}>{h}</Text>
                  <Text style={{ color: C.sub }}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      ) : loading ? (
        <View style={sr.center}><ActivityIndicator color={COLORS.red} size="large" /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListHeaderComponent={() => (
            <Text style={[{ fontSize: 13, color: C.sub, marginBottom: 12 }]}>
              {results.length} natiijo "{query}"
            </Text>
          )}
          ListEmptyComponent={() => (
            <View style={sr.center}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
              <Text style={[{ fontSize: 15, color: C.sub }]}>Wax lama helin</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[sr.resultCard, { backgroundColor: C.card }]}
              onPress={() => navigation.navigate('ListingDetail', { listing: item })}
            >
              <View style={sr.resultImg}>
                {item.images?.[0]
                  ? <Image source={{ uri: item.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <Text style={{ fontSize: 32 }}>{typeEmoji[item.type] || '🏠'}</Text>
                }
              </View>
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={[{ fontSize: 14, fontWeight: '700', color: C.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[{ fontSize: 11, color: C.sub, marginTop: 3 }]}>📍 {item.district}, {item.city}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.red }}>${item.price}<Text style={{ fontSize: 10, fontWeight: '400', color: C.sub }}>/bil</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 11, color: C.sub }}>🛏 {item.rooms}</Text>
                    <Text style={{ fontSize: 11, color: C.sub }}>📐 {item.area}m²</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const sr = StyleSheet.create({
  root:       { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  searchRow:  { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchBar:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  input:      { flex: 1, fontSize: 14, padding: 0 },
  searchBtn:  { backgroundColor: COLORS.red, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.gray200, backgroundColor: 'white', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  chipTxt:    { fontSize: 12, fontWeight: '500', color: COLORS.gray600 },
  histHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  histItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  resultCard: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  resultImg:  { width: 110, height: 110, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
});

