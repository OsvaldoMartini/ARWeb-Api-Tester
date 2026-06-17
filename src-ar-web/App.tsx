import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { AiAssistantPage } from '@/pages/AiAssistantPage';
import { ApiCatalogPage } from '@/pages/ApiCatalogPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SeparationProgressPage } from '@/pages/SeparationProgressPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="assistant" element={<AiAssistantPage />} />
        <Route path="catalog" element={<ApiCatalogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="separation" element={<SeparationProgressPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
