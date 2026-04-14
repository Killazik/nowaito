import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../hooks/api';
import { Avatar } from '../components/Avatar';
import { useAppStore } from '../store/app';

type AdminUser = {
  id: string;
  phoneNumber: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
};

type ChannelParticipant = {
  id: string;
  role: string;
  user: {
    id: string;
    username?: string | null;
    firstName?: string | null;
    phoneNumber: string;
  };
};

type AdminChannel = {
  id: string;
  title?: string | null;
  category?: string | null;
  createdAt: string;
  participants: ChannelParticipant[];
  _count?: { participants: number; messages: number };
};

const getUserLabel = (user: Pick<AdminUser, 'firstName' | 'username' | 'phoneNumber'>) =>
  user.firstName || user.username || user.phoneNumber;

const getParticipantLabel = (participant: ChannelParticipant['user']) =>
  participant.firstName || participant.username || participant.phoneNumber;

export function AdminPage() {
  const navigate = useNavigate();
  const setStoreUser = useAppStore((s) => s.setUser);
  const storeUser = useAppStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [channels, setChannels] = useState<AdminChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'channels'>('users');
  const [busyKey, setBusyKey] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: me }, { data: usersData }, { data: channelsData }] = await Promise.all([
        api.get('/api/me'),
        api.get('/api/admin/users'),
        api.get('/api/admin/channels'),
      ]);

      if (!me?.isAdmin) {
        navigate('/chat', { replace: true });
        return;
      }

      setStoreUser(me);
      setUsers(usersData);
      setChannels(channelsData);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        navigate('/chat', { replace: true });
        return;
      }
      setError('Не удалось загрузить админ-панель');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const adminsCount = useMemo(() => users.filter((user) => user.isAdmin).length, [users]);
  const blockedCount = useMemo(() => users.filter((user) => user.isBlocked).length, [users]);

  const updateUser = async (userId: string, changes: Partial<Pick<AdminUser, 'isAdmin' | 'isBlocked'>>) => {
    setBusyKey(`user:${userId}`);
    setStatus('');
    setError('');
    try {
      const { data } = await api.patch(`/api/admin/users/${userId}`, changes);
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...data } : user)));
      if (storeUser?.id === userId) setStoreUser({ ...storeUser, ...data });
      setStatus('Пользователь обновлен');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось обновить пользователя');
    } finally {
      setBusyKey('');
    }
  };

  const updateChannelRole = async (channelId: string, userId: string, role: 'admin' | 'member') => {
    setBusyKey(`channel-role:${channelId}:${userId}`);
    setStatus('');
    setError('');
    try {
      const { data } = await api.patch(`/api/admin/channels/${channelId}/participants/${userId}`, { role });
      setChannels((prev) => prev.map((channel) => {
        if (channel.id !== channelId) return channel;
        return {
          ...channel,
          participants: channel.participants.map((participant) =>
            participant.user.id === userId ? { ...participant, role: data.role } : participant,
          ),
        };
      }));
      setStatus(role === 'admin' ? 'Админ канала назначен' : 'Админ канала снят');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось обновить роль');
    } finally {
      setBusyKey('');
    }
  };

  const deleteChannel = async (channelId: string) => {
    setBusyKey(`delete:${channelId}`);
    setStatus('');
    setError('');
    try {
      await api.delete(`/api/admin/channels/${channelId}`);
      setChannels((prev) => prev.filter((channel) => channel.id !== channelId));
      setStatus('Канал удален');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось удалить канал');
    } finally {
      setBusyKey('');
    }
  };

  if (loading) {
    return <div className='min-h-screen bg-[#0b0b0b] p-6 text-white'>Загрузка админ-панели...</div>;
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#0b0b0b] text-white'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute left-[10%] top-[4%] h-[24rem] w-[24rem] rounded-full bg-white/10 blur-[140px]' />
        <div className='absolute right-[8%] top-[16%] h-[22rem] w-[22rem] rounded-full bg-white/7 blur-[140px]' />
        <div className='absolute bottom-[-10%] left-1/2 h-[24rem] w-[30rem] -translate-x-1/2 rounded-full bg-white/6 blur-[150px]' />
      </div>

      <div className='relative mx-auto max-w-7xl p-4 md:p-6'>
        <div className='rounded-[2rem] border border-white/10 bg-[#141414]/88 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-5'>
          <div className='flex flex-col gap-4 rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-5 py-4 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-4'>
              <img src='/nowaito-logo.png' alt='Nowaito' className='h-12 w-12 object-contain opacity-95' />
              <div>
                <p className='text-sm font-semibold tracking-[0.22em] text-white/88'>NoWaito</p>
                <h1 className='text-2xl font-semibold text-white/95'>Админ-панель</h1>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <button type='button' className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white/88' onClick={() => navigate('/chat')}>
                Назад в чаты
              </button>
              <button type='button' className='rounded-2xl bg-white px-4 py-2.5 font-medium text-black' onClick={loadAdminData}>
                Обновить
              </button>
            </div>
          </div>

          <div className='mt-4 grid gap-4 md:grid-cols-3'>
            <div className='rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4'>
              <p className='text-sm text-white/48'>Пользователи</p>
              <p className='mt-2 text-3xl font-semibold text-white/95'>{users.length}</p>
            </div>
            <div className='rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4'>
              <p className='text-sm text-white/48'>Администраторы</p>
              <p className='mt-2 text-3xl font-semibold text-white/95'>{adminsCount}</p>
            </div>
            <div className='rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4'>
              <p className='text-sm text-white/48'>Заблокированы</p>
              <p className='mt-2 text-3xl font-semibold text-white/95'>{blockedCount}</p>
            </div>
          </div>

          <div className='mt-5 flex gap-2'>
            <button
              type='button'
              className={`rounded-2xl border px-4 py-2.5 ${activeTab === 'users' ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.04] text-white/86'}`}
              onClick={() => setActiveTab('users')}
            >
              Пользователи
            </button>
            <button
              type='button'
              className={`rounded-2xl border px-4 py-2.5 ${activeTab === 'channels' ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.04] text-white/86'}`}
              onClick={() => setActiveTab('channels')}
            >
              Каналы
            </button>
          </div>

          {error ? <div className='mt-4 rounded-2xl border border-[#4d3b3b] bg-[#261a1a] px-4 py-3 text-sm text-[#f0c4c4]'>{error}</div> : null}
          {status ? <div className='mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/84'>{status}</div> : null}

          {activeTab === 'users' ? (
            <div className='mt-5 grid gap-3'>
              {users.map((user) => (
                <div key={user.id} className='rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4'>
                  <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                    <div className='flex items-center gap-3'>
                      <Avatar name={getUserLabel(user)} src={user.avatarUrl} size='lg' />
                      <div>
                        <p className='font-medium text-white/94'>{getUserLabel(user)}</p>
                        <p className='text-sm text-white/50'>{user.phoneNumber}{user.username ? ` · @${user.username}` : ''}</p>
                        <p className='mt-1 text-xs text-white/40'>
                          {user.isAdmin ? 'Админ системы' : 'Обычный пользователь'}{user.isBlocked ? ' · Заблокирован' : ''}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        className='rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/88 disabled:opacity-50'
                        disabled={busyKey === `user:${user.id}` || user.id === storeUser?.id}
                        onClick={() => updateUser(user.id, { isAdmin: !user.isAdmin })}
                      >
                        {user.isAdmin ? 'Снять admin' : 'Сделать admin'}
                      </button>
                      <button
                        type='button'
                        className={`rounded-2xl border px-4 py-2 text-sm disabled:opacity-50 ${user.isBlocked ? 'border-white/10 bg-white text-black' : 'border-white/10 bg-white/[0.04] text-white/88'}`}
                        disabled={busyKey === `user:${user.id}` || user.id === storeUser?.id}
                        onClick={() => updateUser(user.id, { isBlocked: !user.isBlocked })}
                      >
                        {user.isBlocked ? 'Разбанить' : 'Заблокировать'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='mt-5 grid gap-4'>
              {channels.map((channel) => (
                <div key={channel.id} className='rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4'>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <p className='text-lg font-semibold text-white/94'>{channel.title || 'Без названия'}</p>
                      <p className='mt-1 text-sm text-white/48'>
                        {channel.category || 'Без категории'} · Участников: {channel._count?.participants ?? channel.participants.length} · Сообщений: {channel._count?.messages ?? 0}
                      </p>
                    </div>
                    <button
                      type='button'
                      className='rounded-2xl border border-[#5a2d2d] bg-[#2a1515] px-4 py-2 text-sm text-[#f0c4c4] disabled:opacity-50'
                      disabled={busyKey === `delete:${channel.id}`}
                      onClick={() => deleteChannel(channel.id)}
                    >
                      Удалить канал
                    </button>
                  </div>

                  <div className='mt-4 grid gap-2'>
                    {channel.participants.map((participant) => (
                      <div key={participant.id} className='flex flex-col gap-3 rounded-[1.2rem] border border-white/8 bg-black/10 p-3 md:flex-row md:items-center md:justify-between'>
                        <div>
                          <p className='font-medium text-white/92'>{getParticipantLabel(participant.user)}</p>
                          <p className='text-sm text-white/45'>{participant.user.phoneNumber}{participant.user.username ? ` · @${participant.user.username}` : ''}</p>
                        </div>
                        <div className='flex gap-2'>
                          <button
                            type='button'
                            className={`rounded-2xl border px-4 py-2 text-sm disabled:opacity-50 ${participant.role === 'member' ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.04] text-white/88'}`}
                            disabled={busyKey === `channel-role:${channel.id}:${participant.user.id}`}
                            onClick={() => updateChannelRole(channel.id, participant.user.id, 'member')}
                          >
                            Участник
                          </button>
                          <button
                            type='button'
                            className={`rounded-2xl border px-4 py-2 text-sm disabled:opacity-50 ${participant.role === 'admin' ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.04] text-white/88'}`}
                            disabled={busyKey === `channel-role:${channel.id}:${participant.user.id}`}
                            onClick={() => updateChannelRole(channel.id, participant.user.id, 'admin')}
                          >
                            Админ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
