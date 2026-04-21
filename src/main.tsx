import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Buffer } from 'buffer';
import process from 'process';

// Polyfills for simple-peer in Vite
// @ts-ignore
window.global = window;
window.Buffer = Buffer;
window.process = process;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
