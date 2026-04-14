import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, resolveMediaUrl } from '../hooks/api';
import { useAppStore } from '../store/app';
import { Avatar } from '../components/Avatar';

const isVideoFile = (file: File) => file.type.startsWith('video/');

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAppStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | 'avatar' | 'banner'>(null);

  useEffect(() => {
    api.get('/api/me').then((r) => {
      setUser(r.data);
      setFirstName(r.data.firstName || '');
      setLastName(r.data.lastName || '');
      setUsername(r.data.username || '');
      setBio(r.data.bio || '');
    });
  }, [setUser]);

  const bannerNode = useMemo(() => {
    const bannerUrl = resolveMediaUrl(user?.bannerUrl);
    if (!bannerUrl) return <div className='h-40 rounded-3xl bg-[#2a2a2a] border border-[#3b3b3b]' />;
    if (user?.bannerType === 'video') {
      return <video src={bannerUrl} className='h-40 w-full rounded-3xl object-cover border border-[#3b3b3b]' autoPlay muted loop playsInline />;
    }
    return <img src={bannerUrl} className='h-40 w-full rounded-3xl object-cover border border-[#3b3b3b]' alt='banner' />;
  }, [user]);

  const uploadMedia = async (target: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    setError('');
    setStatus('');
    setUploading(target);

    let durationSec = 0;
    if (isVideoFile(file)) {
      durationSec = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video');
        const objectUrl = URL.createObjectURL(file);

        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const duration = video.duration || 0;
          URL.revokeObjectURL(objectUrl);
          resolve(duration);
        };
        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to read video'));
        };
        video.src = objectUrl;
      });

      if (!durationSec || durationSec > 10) {
        setError('Видео для аватарки или баннера должно быть не длиннее 10 секунд');
        setUploading(null);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target', target);
    if (durationSec) formData.append('durationSec', String(Math.round(durationSec)));

    try {
      const { data } = await api.post('/api/me/upload-profile-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data);
      setStatus(target === 'avatar' ? 'Аватар обновлен' : 'Баннер обновлен');
    } catch {
      setError('Ошибка загрузки медиа');
    } finally {
      setUploading(null);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const { data } = await api.put('/api/me/profile', { firstName, lastName, username, bio });
      setUser(data);
      setStatus('Профиль сохранен');
    } catch {
      setError('Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#161616] text-text p-3 md:p-6'>
      <div className='max-w-4xl mx-auto space-y-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-semibold'>Профиль</h1>
          <button type='button' className='px-4 py-2 rounded-2xl bg-[#2b2b2b] hover:bg-[#3a3a3a]' onClick={() => navigate('/chat')}>
            Назад в чаты
          </button>
        </div>

        <div className='bg-[#1f1f1f] border border-[#2c2c2c] rounded-3xl p-4 md:p-6 space-y-4'>
          {bannerNode}

          <div className='flex flex-col md:flex-row md:items-center gap-4'>
            <Avatar name={user?.firstName || user?.username || 'U'} src={user?.avatarUrl} size='lg' />

            <div className='flex flex-wrap gap-2'>
              <label className='px-3 py-2 rounded-2xl bg-[#2d2d2d] hover:bg-[#3a3a3a] cursor-pointer'>
                {uploading === 'avatar' ? 'Загрузка...' : 'Загрузить аватар'}
                <input type='file' accept='image/*,video/*' className='hidden' onChange={(e) => uploadMedia('avatar', e.target.files?.[0])} />
              </label>

              <label className='px-3 py-2 rounded-2xl bg-[#2d2d2d] hover:bg-[#3a3a3a] cursor-pointer'>
                {uploading === 'banner' ? 'Загрузка...' : 'Загрузить баннер'}
                <input type='file' accept='image/*,video/*' className='hidden' onChange={(e) => uploadMedia('banner', e.target.files?.[0])} />
              </label>

              <p className='text-xs text-muted self-center'>Видео цикличное, максимум 10 секунд</p>
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-3'>
            <input className='bg-[#272727] border border-[#3a3a3a] rounded-2xl p-3' placeholder='Имя' value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className='bg-[#272727] border border-[#3a3a3a] rounded-2xl p-3' placeholder='Фамилия' value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input className='bg-[#272727] border border-[#3a3a3a] rounded-2xl p-3 md:col-span-2' placeholder='Username' value={username} onChange={(e) => setUsername(e.target.value)} />
            <textarea className='bg-[#272727] border border-[#3a3a3a] rounded-2xl p-3 md:col-span-2 min-h-24' placeholder='О себе' value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          {error && <p className='text-sm bg-[#2a2a2a] border border-[#3c3c3c] rounded-2xl p-3'>{error}</p>}
          {status && <p className='text-sm bg-[#1f2a1f] border border-[#355235] rounded-2xl p-3'>{status}</p>}

          <button type='button' className='px-4 py-2 rounded-2xl bg-accent text-black font-semibold disabled:opacity-60' onClick={saveProfile} disabled={saving || uploading !== null}>
            {saving ? 'Сохранение...' : 'Сохранить профиль'}
          </button>
        </div>
      </div>
    </div>
  );
}
