import {StrictMode, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

/**
 * Custom state-based router implementation with deep-link path initialization
 */
function StateRouter({children}: {children: ReactNode}) {
  const initialEntry = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : '/';

  return (
    <MemoryRouter initialEntries={[initialEntry || '/']}>
      {children}
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StateRouter>
      <App />
    </StateRouter>
  </StrictMode>,
);

