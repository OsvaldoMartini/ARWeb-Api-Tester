import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { ImportApisPage } from '@/pages/ImportApisPage';
import { ApiCatalogPage } from '@/pages/ApiCatalogPage';
import { BusinessCategoriesPage } from '@/pages/BusinessCategoriesPage';
import { TestCasesPage } from '@/pages/TestCasesPage';
import { BotJobDesignerPage } from '@/pages/BotJobDesignerPage';
import { ExecuteTestsPage } from '@/pages/ExecuteTestsPage';
import { MockServerPage } from '@/pages/MockServerPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { EnvironmentsPage } from '@/pages/EnvironmentsPage';
import { BotBuilderPage } from '@/pages/BotBuilderPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="import" element={<ImportApisPage />} />
        <Route path="catalog" element={<ApiCatalogPage />} />
        <Route path="categories" element={<BusinessCategoriesPage />} />
        <Route path="test-cases" element={<TestCasesPage />} />
        <Route path="builder" element={<BotBuilderPage />} />
        <Route path="designer" element={<BotJobDesignerPage />} />
        <Route path="environments" element={<EnvironmentsPage />} />
        <Route path="execute" element={<ExecuteTestsPage />} />
        <Route path="mock" element={<MockServerPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Unknown paths fall back to Home rather than a dead end. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
