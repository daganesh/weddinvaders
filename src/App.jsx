import { useEffect, useState } from 'react';
import Game from './Game';
import AdminScreen from './AdminScreen';

function isAdminRoute() {
  return window.location.hash === '#/admin';
}

export default function App() {
  const [admin, setAdmin] = useState(isAdminRoute());

  useEffect(() => {
    const onHashChange = () => setAdmin(isAdminRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (admin) {
    return <AdminScreen onExit={() => { window.location.hash = ''; }} />;
  }
  return <Game />;
}
