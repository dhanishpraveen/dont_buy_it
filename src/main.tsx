import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { RequirementProvider } from './context/RequirementContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider><RequirementProvider><App /></RequirementProvider></AuthProvider>
    </StrictMode>,
);