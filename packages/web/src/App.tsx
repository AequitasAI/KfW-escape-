import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingView } from './views/LandingView.js';
import { HostView } from './views/HostView.js';
import { JoinView } from './views/JoinView.js';
import { GameView } from './views/GameView.js';
import { DisplayView } from './views/DisplayView.js';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingView />} />
        <Route path="/host" element={<HostView />} />
        <Route path="/host/:code" element={<HostView />} />
        <Route path="/join/:code" element={<JoinView />} />
        <Route path="/game/:code" element={<GameView />} />
        <Route path="/display/:code" element={<DisplayView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
