import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { RequirementProvider } from './context/RequirementContext';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RequirementProvider><App /></RequirementProvider>
    </StrictMode>,
);