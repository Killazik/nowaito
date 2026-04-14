import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  const token = localStorage.getItem('accessToken');
  return <BrowserRouter>
    <Routes>
      <Route path='/' element={<LoginPage />} />
      <Route path='/chat' element={token ? <ChatPage /> : <Navigate to='/' replace />} />
      <Route path='/profile' element={token ? <ProfilePage /> : <Navigate to='/' replace />} />
      <Route path='/settings' element={token ? <SettingsPage /> : <Navigate to='/' replace />} />
      <Route path='/admin' element={token ? <AdminPage /> : <Navigate to='/' replace />} />
    </Routes>
  </BrowserRouter>;
}

export default App;

