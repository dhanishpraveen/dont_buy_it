import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { RequirementProvider } from './context/RequirementContext';
import { LocationProvider } from './context/LocationContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider><LocationProvider><RequirementProvider><App /></RequirementProvider></LocationProvider></AuthProvider>
    </StrictMode>,
);