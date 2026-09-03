import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { PlayerModal } from './components/PlayerModal.tsx';
import { Preparazione } from './routes/Preparazione.tsx';
import { Asta } from './routes/Asta.tsx';
import { Squadre } from './routes/Squadre.tsx';
import { Impostazioni } from './routes/Impostazioni.tsx';

const NAV = [
  { to: '/', label: 'Preparazione', icon: '📋', end: true },
  { to: '/asta', label: 'Asta', icon: '🔨', end: false },
  { to: '/squadre', label: 'Squadre', icon: '📊', end: false },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️', end: false },
];

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <header className="topbar">
          <span className="brand">⚽ Fantasta</span>
          <nav className="topnav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="page">
          <Routes>
            <Route path="/" element={<Preparazione />} />
            <Route path="/asta" element={<Asta />} />
            <Route path="/squadre" element={<Squadre />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
          </Routes>
        </main>

        <nav className="bottomnav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="ic">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <PlayerModal />
      </div>
    </HashRouter>
  );
}
