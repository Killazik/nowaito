import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/api';
import { Avatar } from '../components/Avatar';
import { useAppStore, type Chat, type User } from '../store/app';
import {
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
  type CanMessageMode,
  type MessageTextSize,
  type SelectablePerson,
  type VisibilityMode,
} from '../lib/settings';

const textSizeOptions: { value: MessageTextSize; label: string; hint: string }[] = [
  { value: 'sm', label: 'Маленький', hint: 'Компактные сообщения' },
  { value: 'md', label: 'Средний', hint: 'Стандартный размер' },
  { value: 'lg', label: 'Крупный', hint: 'Увеличенный текст' },
];

const visibilityOptions: { value: VisibilityMode; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'nobody', label: 'Никто' },
  { value: 'selected', label: 'Некоторые' },
];

const messagePermissionOptions: { value: CanMessageMode; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'contacts', label: 'Контакты' },
];

const getPersonLabel = (user: User) => user.firstName || user.username || user.phoneNumber;

export function SettingsPage() {
  const navigate = useNavigate();
  const storeUser = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(() => loadAppSettings());
  const [draftSettings, setDraftSettings] = useState<AppSettings>(() => loadAppSettings());
  const [contacts, setContacts] = useState<SelectablePerson[]>([]);
  const [status, setStatus] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/me').then((r) => setUser(r.data)).catch(() => null);
    api.get('/api/chats')
      .then((r) => {
        const users = new Map<string, SelectablePerson>();
        (r.data as Chat[]).forEach((chat) => {
          (chat.participants || []).forEach((participant) => {
            if (participant.user.id === storeUser?.id) return;
            users.set(participant.user.id, {
              id: participant.user.id,
              label: getPersonLabel(participant.user),
            });
          });
        });
        setContacts(Array.from(users.values()));
      })
      .catch(() => setContacts([]));
  }, [setUser, storeUser?.id]);

  const isDirty = useMemo(() => JSON.stringify(savedSettings) !== JSON.stringify(draftSettings), [savedSettings, draftSettings]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateDraft = (updater: (prev: AppSettings) => AppSettings) => {
    setDraftSettings((prev) => updater(prev));
    setStatus('');
  };

  const togglePerson = (current: SelectablePerson[], person: SelectablePerson) => {
    const exists = current.some((item) => item.id === person.id);
    return exists ? current.filter((item) => item.id !== person.id) : [...current, person];
  };

  const requestNotificationPermission = async (enabled: boolean) => {
    if (!enabled || typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore permission errors and keep preference local.
      }
    }
  };

  const saveChanges = async () => {
    saveAppSettings(draftSettings);
    setSavedSettings(draftSettings);
    setStatus('Настройки сохранены');
    await requestNotificationPermission(draftSettings.notifications.enabled);
  };

  const attemptNavigate = (path: string) => {
    if (!isDirty) {
      navigate(path);
      return;
    }
    setPendingPath(path);
    setShowExitConfirm(true);
  };

  const discardAndExit = () => {
    const target = pendingPath;
    setDraftSettings(savedSettings);
    setShowExitConfirm(false);
    setPendingPath(null);
    if (target) navigate(target);
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
    setPendingPath(null);
  };

  const selectedBlacklistIds = useMemo(() => new Set(draftSettings.privacy.blacklist.map((p) => p.id)), [draftSettings.privacy.blacklist]);
  const selectedPhoneIds = useMemo(() => new Set(draftSettings.privacy.phoneVisibleTo.map((p) => p.id)), [draftSettings.privacy.phoneVisibleTo]);
  const selectedPhotoIds = useMemo(() => new Set(draftSettings.privacy.photoVisibleTo.map((p) => p.id)), [draftSettings.privacy.photoVisibleTo]);

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#0b0b0b] text-white'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute left-[14%] top-[6%] h-[24rem] w-[24rem] rounded-full bg-white/12 blur-[130px]' />
        <div className='absolute right-[8%] top-[24%] h-[22rem] w-[22rem] rounded-full bg-white/9 blur-[135px]' />
        <div className='absolute bottom-[-10%] left-1/2 h-[24rem] w-[30rem] -translate-x-1/2 rounded-full bg-white/6 blur-[150px]' />
      </div>

      <div className='relative mx-auto max-w-5xl p-4 md:p-6'>
        <div className='rounded-[2rem] border border-white/10 bg-[#141414]/88 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-5'>
          <div className='flex items-center justify-between rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-5 py-4'>
            <div className='flex items-center gap-3'>
              <Avatar name={storeUser?.firstName || storeUser?.username || 'U'} src={storeUser?.avatarUrl} size='lg' />
              <div>
                <p className='text-[11px] uppercase tracking-[0.28em] text-white/42'>nowaito</p>
                <h1 className='text-2xl font-semibold text-white/95'>Настройки</h1>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-medium text-white transition hover:bg-white/[0.08]' onClick={() => attemptNavigate('/chat')}>
                Назад к чатам
              </button>
              <button type='button' className='rounded-2xl bg-white px-4 py-2.5 font-medium text-black transition hover:bg-white/92 disabled:opacity-60' onClick={saveChanges} disabled={!isDirty}>
                Сохранить
              </button>
            </div>
          </div>

          <div className='mt-4 flex items-center justify-between rounded-[1.3rem] border border-white/8 bg-white/[0.02] px-4 py-3'>
            <p className='text-sm text-white/68'>{isDirty ? 'Есть несохраненные изменения' : 'Все изменения сохранены'}</p>
            {status ? <p className='text-sm text-white/78'>{status}</p> : null}
          </div>

          <div className='mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]'>
            <section className='rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5'>
              <p className='text-xs uppercase tracking-[0.26em] text-white/38'>Общие настройки</p>
              <h2 className='mt-2 text-xl font-semibold text-white/94'>Интерфейс</h2>
              <p className='mt-1 text-sm text-white/42'>Выбери размер текста для сообщений в чатах.</p>

              <div className='mt-5 grid gap-3'>
                {textSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    className={`rounded-[1.3rem] border p-4 text-left transition ${
                      draftSettings.general.messageTextSize === option.value
                        ? 'border-white/18 bg-white text-black'
                        : 'border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.06]'
                    }`}
                    onClick={() => updateDraft((prev) => ({
                      ...prev,
                      general: { ...prev.general, messageTextSize: option.value },
                    }))}
                  >
                    <p className='font-medium'>{option.label}</p>
                    <p className={`text-sm ${draftSettings.general.messageTextSize === option.value ? 'text-black/60' : 'text-white/45'}`}>{option.hint}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className='rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5'>
              <p className='text-xs uppercase tracking-[0.26em] text-white/38'>Уведомления</p>
              <h2 className='mt-2 text-xl font-semibold text-white/94'>Push и звуки</h2>
              <p className='mt-1 text-sm text-white/42'>Можно включить или полностью отключить уведомления.</p>

              <div className='mt-5 rounded-[1.3rem] border border-white/10 bg-white/[0.02] p-4'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <p className='font-medium text-white/92'>Уведомления</p>
                    <p className='text-sm text-white/42'>Показывать уведомления о новых сообщениях</p>
                  </div>
                  <button
                    type='button'
                    className={`relative h-8 w-14 rounded-full transition ${draftSettings.notifications.enabled ? 'bg-white' : 'bg-white/12'}`}
                    onClick={() => updateDraft((prev) => ({
                      ...prev,
                      notifications: { enabled: !prev.notifications.enabled },
                    }))}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full transition ${draftSettings.notifications.enabled ? 'left-7 bg-black' : 'left-1 bg-white'}`} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className='mt-5 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5'>
            <p className='text-xs uppercase tracking-[0.26em] text-white/38'>Конфиденциальность</p>
            <h2 className='mt-2 text-xl font-semibold text-white/94'>Кто что видит и кто может писать</h2>
            <p className='mt-1 text-sm text-white/42'>Черный список, видимость номера, фото и ограничения на входящие сообщения.</p>

            <div className='mt-5 grid gap-4 lg:grid-cols-2'>
              <div className='rounded-[1.3rem] border border-white/10 bg-white/[0.02] p-4'>
                <p className='font-medium text-white/92'>Черный список</p>
                <p className='mt-1 text-sm text-white/42'>Люди из списка не смогут нормально взаимодействовать с тобой.</p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {contacts.length ? contacts.map((person) => (
                    <button
                      key={person.id}
                      type='button'
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        selectedBlacklistIds.has(person.id)
                          ? 'border-white/18 bg-white text-black'
                          : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                      }`}
                      onClick={() => updateDraft((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          blacklist: togglePerson(prev.privacy.blacklist, person),
                        },
                      }))}
                    >
                      {person.label}
                    </button>
                  )) : <p className='text-sm text-white/38'>Пока нет доступных контактов для выбора.</p>}
                </div>
              </div>

              <div className='rounded-[1.3rem] border border-white/10 bg-white/[0.02] p-4'>
                <p className='font-medium text-white/92'>Кто может писать</p>
                <p className='mt-1 text-sm text-white/42'>Разрешить сообщения всем или только контактам.</p>
                <div className='mt-4 flex gap-2'>
                  {messagePermissionOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      className={`rounded-2xl border px-4 py-2 text-sm transition ${
                        draftSettings.privacy.canMessage === option.value
                          ? 'border-white/18 bg-white text-black'
                          : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                      }`}
                      onClick={() => updateDraft((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, canMessage: option.value },
                      }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className='rounded-[1.3rem] border border-white/10 bg-white/[0.02] p-4'>
                <p className='font-medium text-white/92'>Кто видит мой номер</p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      className={`rounded-2xl border px-4 py-2 text-sm transition ${
                        draftSettings.privacy.phoneVisibility === option.value
                          ? 'border-white/18 bg-white text-black'
                          : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                      }`}
                      onClick={() => updateDraft((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          phoneVisibility: option.value,
                          phoneVisibleTo: option.value === 'selected' ? prev.privacy.phoneVisibleTo : [],
                        },
                      }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {draftSettings.privacy.phoneVisibility === 'selected' ? (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {contacts.length ? contacts.map((person) => (
                      <button
                        key={person.id}
                        type='button'
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          selectedPhoneIds.has(person.id)
                            ? 'border-white/18 bg-white text-black'
                            : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                        }`}
                        onClick={() => updateDraft((prev) => ({
                          ...prev,
                          privacy: {
                            ...prev.privacy,
                            phoneVisibleTo: togglePerson(prev.privacy.phoneVisibleTo, person),
                          },
                        }))}
                      >
                        {person.label}
                      </button>
                    )) : <p className='text-sm text-white/38'>Нет контактов для выбора.</p>}
                  </div>
                ) : null}
              </div>

              <div className='rounded-[1.3rem] border border-white/10 bg-white/[0.02] p-4'>
                <p className='font-medium text-white/92'>Кто видит мое фото</p>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type='button'
                      className={`rounded-2xl border px-4 py-2 text-sm transition ${
                        draftSettings.privacy.photoVisibility === option.value
                          ? 'border-white/18 bg-white text-black'
                          : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                      }`}
                      onClick={() => updateDraft((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          photoVisibility: option.value,
                          photoVisibleTo: option.value === 'selected' ? prev.privacy.photoVisibleTo : [],
                        },
                      }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {draftSettings.privacy.photoVisibility === 'selected' ? (
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {contacts.length ? contacts.map((person) => (
                      <button
                        key={person.id}
                        type='button'
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          selectedPhotoIds.has(person.id)
                            ? 'border-white/18 bg-white text-black'
                            : 'border-white/10 bg-white/[0.04] text-white/84 hover:bg-white/[0.08]'
                        }`}
                        onClick={() => updateDraft((prev) => ({
                          ...prev,
                          privacy: {
                            ...prev.privacy,
                            photoVisibleTo: togglePerson(prev.privacy.photoVisibleTo, person),
                          },
                        }))}
                      >
                        {person.label}
                      </button>
                    )) : <p className='text-sm text-white/38'>Нет контактов для выбора.</p>}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      {showExitConfirm ? (
        <div className='fixed inset-0 z-30 flex items-center justify-center bg-black/65 p-4'>
          <div className='w-full max-w-md rounded-[1.8rem] border border-white/10 bg-[#141414]/96 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl'>
            <h2 className='text-xl font-semibold text-white'>Вы точно хотите выйти?</h2>
            <p className='mt-3 text-sm leading-relaxed text-white/56'>
              Если выйдете сейчас, изменения не применятся.
            </p>
            <div className='mt-6 flex justify-end gap-2'>
              <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white transition hover:bg-white/[0.08]' onClick={cancelExit}>
                Отменить
              </button>
              <button type='button' className='rounded-2xl bg-white px-4 py-2.5 font-semibold text-black transition hover:bg-white/92' onClick={discardAndExit}>
                Принять изменения
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
