import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ComparePage from './pages/ComparePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import NewTestPage from './pages/NewTestPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RenderingPage from './pages/RenderingPage.jsx';
import SystemPage from './pages/SystemPage.jsx';
import TargetsPage from './pages/TargetsPage.jsx';
import TestDetailPage from './pages/TestDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<NewTestPage />} />
        <Route path="tests/:id" element={<TestDetailPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="system" element={<SystemPage />} />
        <Route path="rendering" element={<RenderingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
