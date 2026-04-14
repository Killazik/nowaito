import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../hooks/api';
import { useAppStore } from '../store/app';

export function LoginPage() {
  const setUser = useAppStore((s) => s.setUser);
  const [phoneNumber, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post(`/api/auth/${mode}`, {
        phoneNumber,
        password,
        deviceName: 'Web Client',
        firstName: firstName.trim() || 'User',
      });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      window.location.href = '/chat';
    } catch {
      setError(mode === 'login' ? 'Неверный номер или пароль' : 'Не удалось создать аккаунт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#0b0b0b] text-text'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute left-1/2 top-[8%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/18 blur-[140px]' />
        <div className='absolute bottom-[-10%] left-[8%] h-[20rem] w-[20rem] rounded-full bg-white/12 blur-[120px]' />
        <div className='absolute right-[10%] top-[24%] h-[18rem] w-[18rem] rounded-full bg-[#ffffff]/8 blur-[120px]' />
        <div className='absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/8 blur-[170px]' />
        <div className='absolute left-1/2 top-1/2 flex h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center opacity-[0.12] blur-[1.5px] mix-blend-screen'>
          <img
            src='/nowaito-logo.png'
            alt='Nowaito'
            className='logo-wave-float logo-wave-float-slow h-[24rem] w-[24rem] object-contain drop-shadow-[0_0_90px_rgba(255,255,255,0.16)] md:h-[28rem] md:w-[28rem]'
          />
        </div>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%)]' />
      </div>

      <div className='relative flex min-h-screen items-center justify-center p-4'>
        <div className='w-full max-w-[28rem] rounded-[2rem] border border-white/10 bg-[#141414]/88 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-5'>
          <div className='rounded-[1.6rem] border border-white/8 bg-[#191919]/90 p-6 md:p-7'>
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-3'>
                  <img src='/nowaito-logo.png' alt='Nowaito' className='logo-coin-turn h-12 w-12 object-contain opacity-95' />
                  <div>
                    <p className='text-sm font-semibold tracking-[0.22em] text-white/88'>NoWaito</p>
                    <p className='mt-0.5 text-[11px] uppercase tracking-[0.3em] text-white/42'>messenger</p>
                  </div>
                </div>
                <h1 className='mt-3 text-3xl font-semibold text-white'>
                  {mode === 'login' ? 'Вход' : 'Регистрация'}
                </h1>
              </div>
            </div>

            <div className='relative mb-6 grid grid-cols-2 rounded-2xl border border-white/8 bg-[#101010] p-1'>
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-[0.9rem] bg-white shadow-[0_10px_30px_rgba(255,255,255,0.18)] transition-transform duration-500 ease-out ${
                  mode === 'login' ? 'translate-x-0' : 'translate-x-full'
                }`}
              />
              <button
                type='button'
                onClick={() => setMode('login')}
                className={`relative z-10 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-300 ${
                  mode === 'login' ? 'text-black' : 'text-[#c7c7c7] hover:text-white'
                }`}
              >
                Вход
              </button>
              <button
                type='button'
                onClick={() => setMode('register')}
                className={`relative z-10 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-300 ${
                  mode === 'register' ? 'text-black' : 'text-[#c7c7c7] hover:text-white'
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={submit} className='space-y-4'>
              <div className='relative overflow-hidden'>
                <div
                  className={`grid transition-all duration-500 ease-out ${
                    mode === 'register'
                      ? 'grid-rows-[1fr] opacity-100 translate-y-0 mb-4'
                      : 'grid-rows-[0fr] opacity-0 -translate-y-3 mb-0'
                  }`}
                >
                  <div className='overflow-hidden'>
                    <input
                      className='w-full rounded-2xl border border-white/8 bg-[#101010] px-4 py-3.5 outline-none transition focus:border-white/60 focus:bg-[#0d0d0d]'
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder='Имя'
                    />
                  </div>
                </div>
              </div>

              <input
                className='w-full rounded-2xl border border-white/8 bg-[#101010] px-4 py-3.5 outline-none transition focus:border-white/60 focus:bg-[#0d0d0d]'
                value={phoneNumber}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='Номер телефона'
              />

              <input
                type='password'
                className='w-full rounded-2xl border border-white/8 bg-[#101010] px-4 py-3.5 outline-none transition focus:border-white/60 focus:bg-[#0d0d0d]'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Пароль'
              />

              {error ? (
                <p className='rounded-2xl border border-[#4d3b3b] bg-[#261a1a] px-4 py-3 text-sm text-[#f0c4c4]'>
                  {error}
                </p>
              ) : null}

              <button
                className='w-full rounded-2xl bg-white px-4 py-3.5 font-semibold text-black transition duration-300 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={loading}
              >
                {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
