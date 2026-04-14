import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveMediaUrl } from '../hooks/api';
import { getSocket } from '../socket';
import { useAppStore, type Message } from '../store/app';
import { Avatar } from '../components/Avatar';
import { loadAppSettings } from '../lib/settings';

const channelCategories = [
  ['news_media', 'Новости и СМИ', '📰'], ['humor_fun', 'Юмор и развлечения', '😂'], ['blogs', 'Блоги', '✍️'],
  ['technology', 'Технологии', '💻'], ['politics', 'Политика', '🏛️'], ['crypto', 'Криптовалюты', '₿'],
  ['movies_series', 'Фильмы и Сериалы', '🎬'], ['science_education', 'Наука и образование', '🔬'], ['economics_finance', 'Экономика и финансы', '📈'],
  ['music', 'Музыка', '🎵'], ['linguistics', 'Лингвистика', '🈯'], ['business_startups', 'Бизнес стартапы', '🚀'],
  ['psychology', 'Психология', '🧠'], ['marketing_ads', 'Маркетинг и реклама', '📣'], ['career', 'Карьера', '💼'],
  ['literature', 'Литература', '📚'], ['travel', 'Путешествия', '✈️'], ['health_sport', 'Здоровье и спорт', '🏃'],
  ['art_photo', 'Искусство и фото', '🎨'], ['fashion_beauty', 'Мода и красота', '💄'], ['medicine', 'Медицина', '🩺'],
  ['games_apps', 'Игры и приложения', '🎮'], ['food_drinks', 'Еда и Напитки', '🍽️'], ['sales', 'Продажи', '🛍️'],
  ['adults', 'Для взрослых 18+', '🔞'],
].map(([id, title, icon]) => ({ id, title, icon }));

const isMobileScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDuration = (seconds?: number | null) => !seconds ? '' : `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;

export function ChatPage() {
  const navigate = useNavigate();
  const { user, chats, messages, activeChatId, setChats, setMessages, setActiveChat, addMessage, setUser } = useAppStore();
  const [text, setText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesMode, setCategoriesMode] = useState<'browse' | 'pick'>('browse');
  const [browseCategory, setBrowseCategory] = useState('');
  const [categoryChannels, setCategoryChannels] = useState<any[]>([]);
  const [loadingCategoryChannels, setLoadingCategoryChannels] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'list' | 'chat'>('list');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [chatType, setChatType] = useState<'private' | 'group' | 'channel'>('private');
  const [title, setTitle] = useState('');
  const [channelCategory, setChannelCategory] = useState('');
  const [participants, setParticipants] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createError, setCreateError] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<null | 'voice' | 'video-note'>(null);
  const [chatError, setChatError] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const token = localStorage.getItem('accessToken') || '';
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef<number>(0);
  const messageTextSize = loadAppSettings().general.messageTextSize;

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId]);
  const selectedCategory = useMemo(() => channelCategories.find((c) => c.id === channelCategory) || null, [channelCategory]);
  const selectedBrowseCategory = useMemo(() => channelCategories.find((c) => c.id === browseCategory) || null, [browseCategory]);
  const messageTextClass = messageTextSize === 'sm' ? 'text-sm' : messageTextSize === 'lg' ? 'text-lg md:text-xl' : 'text-base md:text-[17px]';

  useEffect(() => {
    api.get('/api/me').then((r) => useAppStore.getState().setUser(r.data)).catch(() => null);
    api.get('/api/chats').then((r) => {
      setChats(r.data);
      if (r.data.length && !activeChatId) setActiveChat(r.data[0].id);
    });
  }, [setChats, setActiveChat, activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;
    api.get(`/api/chats/${activeChatId}/messages`).then((r) => setMessages(r.data));
    const socket = getSocket(token);
    const onNewMessage = (message: Message) => { if (message.chatId === activeChatId) addMessage(message); };
    socket.emit('join_chat', { chatId: activeChatId });
    socket.on('new_message', onNewMessage);
    return () => { socket.off('new_message', onNewMessage); };
  }, [activeChatId, token, setMessages, addMessage]);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const getChatName = (chat: (typeof chats)[number]) => {
    if (chat.title) return chat.title;
    const others = (chat.participants || []).map((p) => p.user).filter((u) => u.id !== user?.id);
    return others.length ? others.map((u) => u.firstName || u.username || u.phoneNumber).join(', ') : 'Избранное';
  };
  const getChatAvatar = (chat: (typeof chats)[number]) => chat.avatarUrl || (chat.participants || []).map((p) => p.user).find((u) => u.id !== user?.id)?.avatarUrl;
  const getChatPreview = (chat: (typeof chats)[number]) => {
    const last = chat.messages?.[0];
    if (!last) return chat.type === 'channel' && chat.category ? `Категория: ${chat.category}` : 'Сообщений пока нет';
    const media = last.media?.[0];
    if (media?.type === 'audio') return 'Голосовое сообщение';
    if (media?.type === 'video') return 'Видеокружок';
    if (media?.type === 'photo') return 'Фото';
    if (media?.type === 'file') return 'Файл';
    return last.text || 'Сообщение';
  };

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chats;

    return chats.filter((chat) => {
      const name = getChatName(chat).toLowerCase();
      const preview = getChatPreview(chat).toLowerCase();
      const category = (chat.category || '').toLowerCase();
      return name.includes(query) || preview.includes(query) || category.includes(query);
    });
  }, [chats, searchQuery, user?.id]);

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => setTouchStartX(e.changedTouches[0].clientX);
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (!menuOpen && touchStartX < 40 && delta > 60) setMenuOpen(true);
    if (menuOpen && delta < -60) setMenuOpen(false);
    setTouchStartX(null);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !text.trim() || sendingText) return;
    setChatError(''); setSendingText(true);
    try { const { data } = await api.post(`/api/chats/${activeChatId}/messages`, { text }); addMessage(data); setText(''); }
    catch { setChatError('Не удалось отправить сообщение'); }
    finally { setSendingText(false); }
  };

  const uploadChatMedia = async (file: File, kind: 'voice' | 'video-note', duration?: number, width?: number, height?: number) => {
    if (!activeChatId) return;
    setChatError(''); setUploadingKind(kind);
    const formData = new FormData();
    formData.append('file', file); formData.append('kind', kind);
    if (duration) formData.append('duration', String(Math.round(duration)));
    if (width) formData.append('width', String(Math.round(width)));
    if (height) formData.append('height', String(Math.round(height)));
    try { const { data } = await api.post(`/api/chats/${activeChatId}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); addMessage(data); }
    catch { setChatError(kind === 'voice' ? 'Не удалось отправить голосовое' : 'Не удалось отправить видеокружок'); }
    finally { setUploadingKind(null); }
  };

  const startVoiceRecording = async () => {
    if (!activeChatId || isRecordingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return setChatError('Браузер не поддерживает запись голоса');
    setChatError('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorderStreamRef.current = stream; voiceChunksRef.current = []; voiceStartedAtRef.current = Date.now();
    const recorder = new MediaRecorder(stream); recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size > 0) voiceChunksRef.current.push(event.data); };
    recorder.onstop = async () => {
      const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const duration = Math.max(1, (Date.now() - voiceStartedAtRef.current) / 1000);
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null; recorderRef.current = null; voiceChunksRef.current = [];
      await uploadChatMedia(file, 'voice', duration);
    };
    recorder.start(); setIsRecordingVoice(true);
  };
  const stopVoiceRecording = () => { if (recorderRef.current && recorderRef.current.state !== 'inactive') { setIsRecordingVoice(false); recorderRef.current.stop(); } };

  const onVideoNoteSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (!file.type.startsWith('video/')) return setChatError('Нужен видеофайл для видеокружка');
    const objectUrl = URL.createObjectURL(file);
    try {
      const metadata = await new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve({ duration: video.duration || 0, width: video.videoWidth || 0, height: video.videoHeight || 0 });
        video.onerror = () => reject(new Error('Failed to read video'));
        video.src = objectUrl;
      });
      await uploadChatMedia(file, 'video-note', metadata.duration, metadata.width, metadata.height);
    } catch { setChatError('Не удалось прочитать видео'); }
    finally { URL.revokeObjectURL(objectUrl); }
  };

  const resetCreate = () => {
    setDialogOpen(false); setCreateStep(1); setParticipants(''); setTitle(''); setChannelCategory('');
    setChatType('private'); setCreateError(''); setCreatingChat(false);
  };

  const openCategoriesBrowser = () => {
    setCategoriesMode('browse');
    setBrowseCategory('');
    setCategoryChannels([]);
    setCategoriesOpen(true);
  };

  const openCategoryPicker = () => {
    setCategoriesMode('pick');
    setCategoriesOpen(true);
  };

  const browseChannelsByCategory = async (categoryId: string) => {
    setBrowseCategory(categoryId);
    setLoadingCategoryChannels(true);
    try {
      const { data } = await api.get(`/api/channels/by-category/${categoryId}`);
      setCategoryChannels(data);
    } catch {
      setCategoryChannels([]);
    } finally {
      setLoadingCategoryChannels(false);
    }
  };

  const openOrJoinChannel = async (channelId: string) => {
    try {
      const { data: joined } = await api.post(`/api/chats/${channelId}/join`);
      const { data } = await api.get('/api/chats');
      setChats(data);
      if (joined?.id) setActiveChat(joined.id);
      if (isMobileScreen()) setMobilePanel('chat');
      setCategoriesOpen(false);
      setMenuOpen(false);
    } catch {
      setChatError('Не удалось открыть канал');
    }
  };

  const createChat = async (e: FormEvent) => {
    e.preventDefault(); setCreateError('');
    const participantQueries = participants.split(',').map((v) => v.trim()).filter(Boolean);
    if (chatType === 'private' && participantQueries.length < 1) return setCreateError('Укажи username или номер телефона для личного чата');
    if (chatType === 'group' && !title.trim()) return setCreateError('Введите название беседы');
    if (chatType === 'group' && participantQueries.length < 1) return setCreateError('Добавь хотя бы одного участника в беседу');
    if (chatType === 'channel' && !title.trim()) return setCreateError('Введите название канала');
    if (chatType === 'channel' && !channelCategory) return setCreateError('Выберите категорию канала');
    setCreatingChat(true);
    try {
      const { data: createdChat } = await api.post('/api/chats', { type: chatType, title: chatType === 'private' ? null : title.trim(), category: chatType === 'channel' ? channelCategory : null, participantQueries });
      const { data } = await api.get('/api/chats');
      setChats(data); setActiveChat(createdChat?.id || data[0]?.id || null as any); if (isMobileScreen()) setMobilePanel('chat'); resetCreate();
    } catch (error: any) { setCreateError(typeof error?.response?.data?.message === 'string' ? error.response.data.message : 'Не удалось создать чат'); }
    finally { setCreatingChat(false); }
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null); setMenuOpen(false); navigate('/', { replace: true });
  };

  const renderMessageMedia = (message: Message) => {
    const media = message.media || [];
    if (!media.length) return null;
    return <div className='mt-2 space-y-2'>{media.map((item) => {
      const src = resolveMediaUrl(item.url); if (!src) return null;
      if (item.type === 'audio') return <div key={item.id} className='rounded-2xl border border-white/10 bg-black/25 p-2 min-w-[220px]'><p className='mb-2 text-xs text-white/60'>Голосовое {formatDuration(item.duration)}</p><audio controls className='w-full' src={src} /></div>;
      if (item.type === 'video') return <div key={item.id} className='flex flex-col items-start gap-1'><video src={src} controls playsInline className='h-40 w-40 rounded-full border border-white/12 bg-black object-cover' /><p className='text-xs text-white/60'>Видеокружок {formatDuration(item.duration)}</p></div>;
      if (item.type === 'photo') return <img key={item.id} src={src} alt='media' className='max-h-72 rounded-2xl border border-white/10 object-cover' />;
      return <a key={item.id} href={src} target='_blank' rel='noreferrer' className='text-sm text-white underline underline-offset-2'>Открыть файл</a>;
    })}</div>;
  };

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#0b0b0b] text-white' onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute left-[18%] top-[8%] h-[26rem] w-[26rem] rounded-full bg-white/12 blur-[130px]' />
        <div className='absolute right-[10%] top-[24%] h-[24rem] w-[24rem] rounded-full bg-white/8 blur-[140px]' />
        <div className='absolute bottom-[-8%] left-1/2 h-[22rem] w-[32rem] -translate-x-1/2 rounded-full bg-white/6 blur-[150px]' />
      </div>
      <div className='relative flex h-screen flex-col p-3 md:p-4'>
        <header className='relative flex h-20 items-center gap-3 rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-5 backdrop-blur-md'>
          <button type='button' className='flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6' onClick={() => setMenuOpen(true)}>≡</button>
          <div className='pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4'>
            <img src='/nowaito-logo.png' alt='Nowaito' className='h-12 w-12 object-contain opacity-95 md:h-14 md:w-14' />
            <div className='text-left'>
              <p className='text-base font-semibold tracking-[0.24em] text-white/90'>NoWaito</p>
              <h1 className='text-sm font-medium tracking-[0.2em] text-white/62'>Massanger</h1>
            </div>
          </div>
        </header>

        <div className='mt-3 grid min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#141414]/84 backdrop-blur-xl md:grid-cols-[360px_1fr]'>
          <aside className={`${mobilePanel === 'chat' ? 'hidden' : 'flex'} md:flex min-h-0 flex-col border-r border-white/8 bg-black/10`}>
            <div className='flex items-center justify-between border-b border-white/8 px-4 py-4'>
              <div><p className='text-sm font-medium text-white/88'>Диалоги</p><p className='text-xs text-white/42'>Ваши личные и групповые чаты</p></div>
              <button type='button' className='rounded-2xl border border-white/10 bg-white px-3 py-2 text-sm font-medium text-black' onClick={() => { setDialogOpen(true); setCreateStep(1); setParticipants(''); setTitle(''); setChannelCategory(''); setChatType('private'); setCreateError(''); }}>
                Новый чат
              </button>
            </div>
            <div className='min-h-0 space-y-2 overflow-auto p-3'>
              <div className='relative'>
                <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/36'>⌕</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Поиск'
                  className='w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/28'
                />
              </div>
              {filteredChats.map((chat) => <button key={chat.id} type='button' onClick={() => { setActiveChat(chat.id); if (isMobileScreen()) setMobilePanel('chat'); }} className={`w-full rounded-[1.4rem] border p-3 text-left transition ${activeChatId === chat.id ? 'border-white/18 bg-white/12' : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'}`}><div className='flex items-center gap-3'><Avatar name={getChatName(chat)} src={getChatAvatar(chat)} size='md' /><div className='min-w-0 flex-1'><p className='truncate font-medium text-white/94'>{getChatName(chat)}</p><p className='truncate text-xs text-white/42'>{getChatPreview(chat)}</p></div></div></button>)}
              {!filteredChats.length ? <div className='rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/48'>Ничего не найдено</div> : null}
            </div>
          </aside>

          <main className={`${mobilePanel === 'list' ? 'hidden' : 'flex'} md:flex min-h-0 flex-col bg-white/[0.02]`}>
            <div className='flex items-center gap-3 border-b border-white/8 bg-black/10 px-4 py-4'>
              <button type='button' className='flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 md:hidden' onClick={() => setMobilePanel('list')}>←</button>
              {activeChat ? <><Avatar name={getChatName(activeChat)} src={getChatAvatar(activeChat)} /><div className='min-w-0'><p className='truncate font-medium text-white/92'>{getChatName(activeChat)}</p><p className='text-xs uppercase tracking-[0.2em] text-white/38'>{activeChat.type}</p></div></> : <p className='text-white/45'>Выберите чат</p>}
            </div>
            <div className='min-h-0 flex-1 overflow-auto px-3 py-4 md:px-5'><div className='space-y-3'>
              {messages.map((message) => { const isMine = message.senderId === user?.id || message.sender?.id === user?.id; return <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-[1.6rem] border px-4 py-3 md:max-w-[70%] ${isMine ? 'border-white/16 bg-white text-black' : 'border-white/10 bg-white/[0.06] text-white'}`}>{message.text ? <p className={`whitespace-pre-wrap break-words ${messageTextClass}`}>{message.text}</p> : null}{renderMessageMedia(message)}<p className={`mt-1 text-right text-[11px] ${isMine ? 'text-black/55' : 'text-white/42'}`}>{message.pending ? 'отправка...' : formatTime(message.createdAt)}</p></div></div>; })}
            </div></div>
            <div className='border-t border-white/8 bg-black/10 p-3 md:p-4'>
              {chatError ? <p className='mb-3 rounded-2xl border border-[#4d3b3b] bg-[#261a1a] px-4 py-3 text-sm text-[#f0c4c4]'>{chatError}</p> : null}
              <form onSubmit={send} className='flex items-end gap-3'>
                <div className='flex-1 space-y-3'>
                  <input className='w-full rounded-[1.2rem] border border-white/10 bg-[#101010]/90 px-4 py-3.5 text-white outline-none placeholder:text-white/28' value={text} onChange={(e) => setText(e.target.value)} placeholder='Напишите сообщение...' />
                  <div className='flex flex-wrap gap-2'>
                    <button type='button' className={`rounded-2xl border px-3 py-2 text-sm ${isRecordingVoice ? 'border-white/16 bg-white text-black' : 'border-white/10 bg-white/[0.05] text-white/86'}`} onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording} disabled={!activeChatId || uploadingKind !== null}>{isRecordingVoice ? 'Стоп запись' : 'Голосовое'}</button>
                    <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/86' onClick={() => videoInputRef.current?.click()} disabled={!activeChatId || uploadingKind !== null}>{uploadingKind === 'video-note' ? 'Загрузка...' : 'Видеокружок'}</button>
                    <input ref={videoInputRef} type='file' accept='video/*' className='hidden' onChange={onVideoNoteSelected} />
                  </div>
                </div>
                <button className='h-[52px] rounded-[1.2rem] bg-white px-5 font-semibold text-black disabled:opacity-60' disabled={!activeChatId || !text.trim() || sendingText || uploadingKind !== null || isRecordingVoice}>{sendingText ? '...' : 'Отправить'}</button>
              </form>
            </div>
          </main>
        </div>

        <div className={`fixed inset-0 bg-black/55 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} />
        <aside className={`fixed left-0 top-0 z-20 flex h-full w-[88vw] max-w-[340px] flex-col border-r border-white/10 bg-[#121212]/94 p-4 backdrop-blur-xl transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className='rounded-[1.6rem] border border-white/8 bg-white/[0.04] p-4'><div className='flex items-center gap-3'><Avatar name={user?.firstName || user?.username || 'User'} src={user?.avatarUrl} size='lg' /><div><p className='font-semibold text-white/95'>{user?.firstName || user?.username || 'User'}</p><p className='text-xs text-white/45'>{user?.phoneNumber}</p></div></div></div>
          <div className='mt-4 space-y-2'>
            <button type='button' className='w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-white/88' onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Профиль</button>
            <button type='button' className='w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-white/88' onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Настройки</button>
            {user?.isAdmin ? <button type='button' className='w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-white/88' onClick={() => { setMenuOpen(false); navigate('/admin'); }}>Админ-панель</button> : null}
          </div>
          <div className='mt-6'>
            <p className='mb-3 text-sm font-medium text-white/72'>Каналы по категориям</p>
            <button type='button' onClick={openCategoriesBrowser} className='w-full rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3 text-left'>
              <p className='font-medium text-white/92'>Открыть категории</p>
              <p className='text-xs text-white/42'>Новости, технологии, музыка, бизнес и другие</p>
            </button>
          </div>
          <div className='mt-auto pt-4'><button type='button' className='w-full rounded-[1.3rem] border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-black' onClick={logout}>Выйти из аккаунта</button></div>
        </aside>

        {dialogOpen ? <div className='fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3'>
          <form onSubmit={createChat} className='w-[92vw] max-w-[480px] rounded-[2rem] border border-white/10 bg-[#141414]/94 p-5 backdrop-blur-xl md:p-6'>
            <div className='flex items-center justify-between'><div><p className='text-[11px] uppercase tracking-[0.26em] text-white/38'>Шаг {createStep} из 2</p><h2 className='mt-1 text-xl font-semibold text-white'>{createStep === 1 ? 'Выбери формат' : chatType === 'private' ? 'Новый личный чат' : chatType === 'group' ? 'Новая беседа' : 'Новый канал'}</h2></div>{createStep === 2 ? <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/82' onClick={() => setCreateStep(1)}>Назад</button> : null}</div>
            {createStep === 1 ? <>
              <p className='mt-2 text-sm text-white/42'>Какой тип диалога ты хочешь создать?</p>
              <div className='mt-5 space-y-3'>
                {[
                  ['private', 'Личный чат', 'Переписка один на один по username или номеру телефона.'],
                  ['group', 'Беседа', 'Группа для общения с несколькими участниками.'],
                  ['channel', 'Канал', 'Односторонний формат для публикаций и обновлений.'],
                ].map(([type, name, desc]) => <button key={type} type='button' className={`w-full rounded-[1.4rem] border p-4 text-left ${chatType === type ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white'}`} onClick={() => setChatType(type as any)}><p className='text-base font-medium'>{name}</p><p className={`mt-1 text-sm ${chatType === type ? 'text-black/60' : 'text-white/45'}`}>{desc}</p></button>)}
              </div>
              <div className='mt-5 flex justify-end gap-2'><button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white/82' onClick={resetCreate}>Отмена</button><button type='button' className='rounded-2xl bg-white px-4 py-2.5 font-semibold text-black' onClick={() => { setCreateError(''); setCreateStep(2); }}>Далее</button></div>
            </> : <>
              <p className='mt-2 text-sm text-white/42'>{chatType === 'private' ? 'Укажи username или номер телефона человека, с которым хочешь начать диалог.' : chatType === 'group' ? 'Добавь название беседы и участников.' : 'Задай название канала, выбери категорию и при желании добавь первых подписчиков.'}</p>
              {chatType !== 'private' ? <input className='mt-4 w-full rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none placeholder:text-white/28' placeholder={chatType === 'group' ? 'Название беседы' : 'Название канала'} value={title} onChange={(e) => setTitle(e.target.value)} /> : null}
              {chatType === 'channel' ? <div className='mt-4'><p className='mb-2 text-sm text-white/62'>Категория канала</p><button type='button' className='flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-left text-white' onClick={openCategoryPicker}><span>{selectedCategory ? `${selectedCategory.icon} ${selectedCategory.title}` : 'Выбрать категорию'}</span><span className='text-white/40'>→</span></button></div> : null}
              <textarea className='mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-[#101010] px-4 py-3 text-white outline-none placeholder:text-white/28' placeholder={chatType === 'private' ? 'Username или номер телефона собеседника' : chatType === 'group' ? 'Добавь участников: username или телефон через запятую' : 'Необязательно: первые подписчики через запятую'} value={participants} onChange={(e) => setParticipants(e.target.value)} />
              <div className='mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/48'>{chatType === 'private' ? 'Для личного чата укажи одного пользователя.' : chatType === 'group' ? 'Беседа поддерживает сразу несколько участников.' : 'Категория поможет пользователям найти канал по интересам.'}</div>
              {createError ? <p className='mt-3 rounded-2xl border border-[#4d3b3b] bg-[#261a1a] px-4 py-3 text-sm text-[#f0c4c4]'>{createError}</p> : null}
              <div className='mt-5 flex justify-end gap-2'><button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white/82' onClick={resetCreate}>Отмена</button><button className='rounded-2xl bg-white px-4 py-2.5 font-semibold text-black disabled:opacity-60' disabled={creatingChat}>{creatingChat ? 'Создание...' : chatType === 'private' ? 'Создать чат' : chatType === 'group' ? 'Создать беседу' : 'Создать канал'}</button></div>
            </>}
          </form>
        </div> : null}

        {categoriesOpen ? <div className='fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3'>
          <div className='w-[94vw] max-w-[760px] rounded-[2rem] border border-white/10 bg-[#141414]/95 p-5 backdrop-blur-xl md:p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[11px] uppercase tracking-[0.26em] text-white/38'>Категории</p>
                <h2 className='mt-1 text-xl font-semibold text-white'>{categoriesMode === 'pick' ? 'Выбор категории канала' : 'Каналы по категориям'}</h2>
              </div>
              <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/82' onClick={() => setCategoriesOpen(false)}>Закрыть</button>
            </div>

            <div className='mt-5 grid gap-3 md:grid-cols-2'>
              {channelCategories.map((category) => {
                const isSelected = categoriesMode === 'pick' ? channelCategory === category.id : browseCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type='button'
                    className={`rounded-[1.4rem] border p-4 text-left ${isSelected ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white'}`}
                    onClick={() => {
                      if (categoriesMode === 'pick') {
                        setChannelCategory(category.id);
                        setCreateError('');
                        setCategoriesOpen(false);
                      } else {
                        browseChannelsByCategory(category.id);
                      }
                    }}
                  >
                    <p className='text-base font-medium'>{category.icon} {category.title}</p>
                    <p className={`mt-1 text-sm ${isSelected ? 'text-black/60' : 'text-white/45'}`}>{categoriesMode === 'pick' ? 'Категория для канала' : 'Открыть подборку каналов'}</p>
                  </button>
                );
              })}
            </div>

            {categoriesMode === 'browse' && browseCategory ? (
              <div className='mt-6 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4'>
                <div className='mb-4 flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white/92'>{selectedBrowseCategory?.icon} {selectedBrowseCategory?.title}</p>
                    <p className='text-xs text-white/42'>Каналы этой категории</p>
                  </div>
                </div>

                {loadingCategoryChannels ? <p className='text-sm text-white/52'>Загрузка...</p> : null}

                {!loadingCategoryChannels && !categoryChannels.length ? (
                  <p className='text-sm text-white/52'>Пока в этой категории нет каналов.</p>
                ) : null}

                {!loadingCategoryChannels ? (
                  <div className='space-y-2'>
                    {categoryChannels.map((channel) => (
                      <button
                        key={channel.id}
                        type='button'
                        onClick={() => openOrJoinChannel(channel.id)}
                        className='w-full rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08]'
                      >
                        <div className='flex items-center justify-between gap-3'>
                          <div>
                            <p className='font-medium text-white/92'>{channel.title || 'Без названия'}</p>
                            <p className='text-xs text-white/42'>Подписчиков: {channel._count?.participants ?? channel.participants?.length ?? 0}</p>
                          </div>
                          <span className='rounded-full border border-white/10 bg-white px-3 py-1 text-xs font-medium text-black'>
                            Открыть
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div> : null}
      </div>
    </div>
  );
}
