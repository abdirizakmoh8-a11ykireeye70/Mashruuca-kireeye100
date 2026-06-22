// ============================================================
//  KIREEYE — ChatScreen.js
// ============================================================
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  listenToMessages, sendMessage, markMessagesRead,
  reactToMessage, pinMessage, sendAutoReply,
} from '../../services/chatService';
import { AppContext, COLORS } from '../../App';

export default function ChatScreen({ route, navigation }) {
  const { chatId, otherUser, listing } = route.params;
  const { user, profile, t, darkMode } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [typing,   setTyping]   = useState(false);

  const C = darkMode
    ? { bg: '#0F0F0F', header: COLORS.darkCard, bubble: COLORS.darkCard, text: COLORS.white, sub: COLORS.gray400, input: COLORS.darkBorder }
    : { bg: COLORS.gray50, header: COLORS.white, bubble: COLORS.white, text: COLORS.black, sub: COLORS.gray400, input: COLORS.gray100 };

  useEffect(() => {
    const unsub = listenToMessages(chatId, (msgs) => {
      setMessages(msgs);
      markMessagesRead(chatId, user.uid);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(chatId, user.uid, msg, 'text');
      // Auto-reply if other user offline
      if (!otherUser?.isOnline) {
        setTimeout(() => sendAutoReply(chatId, otherUser.uid, profile?.language), 1500);
      }
    } catch (e) {
      Alert.alert(t('error'), t('networkError'));
    }
    setSending(false);
  };

  const handleLongPress = (msg) => {
    if (msg.senderId !== user.uid) return;
    Alert.alert('', '', [
      { text: '📌 ' + t('pinMessage'),    onPress: () => pinMessage(chatId, msg.id) },
      { text: '😊 ' + t('react'),         onPress: () => reactToMessage(chatId, msg.id, user.uid, '❤️') },
      { text: t('cancel), style: 'cancel' },
    ]);
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === user.uid;
    const isSystem = item.type === 'system';

    if (isSystem) {
      return (
        <View style={s.systemMsg}>
          <Text style={s.systemText}>{item.content}</Text>
        </View>
      );
    }

    if (item.type === 'payment') {
      return (
        <TouchableOpacity
          style={s.paymentCard}
          onPress={() => navigation.navigate('Payment', { chatId, listing, otherUser })}
        >
          <Text style={s.payTitle}>💰 {t('paymentRequired')}</Text>
          <Text style={s.payAmount}>$3</Text>
          <Text style={s.payDesc}>{t('paymentDesc')}</Text>
          <View style={s.payBtn}>
            <Text style={s.payBtnText}>{t('payNow')}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        style={[s.msgWrap, isMine ? s.msgRight : s.msgLeft]}
      >
        {item.isPinned && <Text style={s.pinIcon}>📌</Text>}
        <View style={[
          s.bubble,
          isMine
            ? s.bubbleMine
            : [s.bubbleOther, { backgroundColor: C.bubble }]
        ]}>
          <Text style={[s.bubbleText, isMine ? { color: 'white' } : { color: C.text }]}>
            {item.content}
          </Text>
          {Object.keys(item.reactions || {}).length > 0 && (
            <View style={s.reactions}>
              {Object.values(item.reactions).map((r, i) => (
                <Text key={i} style={{ fontSize: 14 }}>{r}</Text>
              ))}
            </View>
          )}
        </View>
        <Text style={[s.msgTime, isMine && { textAlign: 'right' }]}>
          {formatTime(item.createdAt)}
          {isMine && (item.read ? ' ✓✓' : ' ✓')}
        </Text>
      </TouchableOpacity>
    );
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.header, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: COLORS.gray600 }}>←</Text>
        </TouchableOpacity>
        <View style={s.headerAvatar}>
          <Text style={{ fontSize: 20 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerName, { color: C.text }]}>{otherUser?.fullName || '—'}</Text>
          <Text style={{ fontSize: 11, color: otherUser?.isOnline ? COLORS.green : COLORS.gray400 }}>
            {otherUser?.isOnline ? '● ' + t('online') : t('lastSeen')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Payment', { chatId, listing, otherUser })}
          style={s.payHeaderBtn}
        >
          <Text style={{ fontSize: 12, color: COLORS.red, fontWeight: '700' }}>💰 $3</Text>
        </TouchableOpacity>
      </View>

      {/* Listing preview */}
      {listing && (
        <View style={[s.listingBar, { backgroundColor: C.bubble, borderBottomColor: C.input }]}>
          <Text style={{ fontSize: 18 }}>🏠</Text>
          <View style={{ flex: 1 }}>
            <Text style={[{ fontSize: 12, fontWeight: '700', color: C.text }]} numberOfLines={1}>{listing.title}</Text>
            <Text style={{ fontSize: 11, color: COLORS.red, fontWeight: '700' }}>${listing.price}{t('perMonth')}</Text>
          </View>
          <View style={[s.statusPill, {
            backgroundColor:
              listing.status === 'available' ? COLORS.green + '22' :
              listing.status === 'rented'    ? COLORS.red + '22' : COLORS.yellow + '22'
          }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color:
              listing.status === 'available' ? COLORS.green :
              listing.status === 'rented'    ? COLORS.red : COLORS.yellow
            }}>
              {listing.status === 'available' ? '🟢' : listing.status === 'rented' ? '🔴' : '🟡'} {listing.status}
            </Text>
          </View>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={[s.inputBar, { backgroundColor: C.header, paddingBottom: insets.bottom + 8, borderTopColor: C.input }]}>
        <TouchableOpacity style={s.iconBtn}>
          <Text style={{ fontSize: 22 }}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={[s.input, { backgroundColor: C.input, color: C.text }]}
          placeholder={t('typeMessage')}
          placeholderTextColor={COLORS.gray400}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={s.iconBtn}>
          <Text style={{ fontSize: 22 }}>🎤</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={{ fontSize: 16, color: 'white' }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.redSoft, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 14, fontWeight: '700' },
  payHeaderBtn: { backgroundColor: COLORS.redSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  listingBar: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 14, gap: 10, borderBottomWidth: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  msgWrap:    { maxWidth: '78%' },
  msgLeft:    { alignSelf: 'flex-start' },
  msgRight:   { alignSelf: 'flex-end' },
  bubble:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: COLORS.red, borderBottomRightRadius: 4 },
  bubbleOther:{ borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  reactions:  { flexDirection: 'row', gap: 2, marginTop: 4 },
  msgTime:    { fontSize: 9, color: COLORS.gray400, marginTop: 3, paddingHorizontal: 4 },
  pinIcon:    { fontSize: 10, color: COLORS.gray400, marginBottom: 2 },
  systemMsg:  { alignSelf: 'center', backgroundColor: COLORS.gray100, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginVertical: 4 },
  systemText: { fontSize: 12, color: COLORS.gray600, textAlign: 'center' },
  paymentCard:{ alignSelf: 'center', borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 16, padding: 16, width: 220, alignItems: 'center', backgroundColor: 'white', gap: 4 },
  payTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.black },
  payAmount:  { fontSize: 26, fontWeight: '800', color: COLORS.red },
  payDesc:    { fontSize: 11, color: COLORS.gray400, textAlign: 'center' },
  payBtn:     { backgroundColor: COLORS.red, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 24, marginTop: 8 },
  payBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, gap: 8, borderTopWidth: 1 },
  iconBtn:    { paddingBottom: 6 },
  input:      { flex: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 100 },
  sendBtn:    { width: 38, height: 38, backgroundColor: COLORS.red, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

