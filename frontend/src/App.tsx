import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BatchReviewPage } from "./pages/BatchReviewPage";
import { BatchesPage } from "./pages/BatchesPage";
import { CatalogPage } from "./pages/CatalogPage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/batches/:id" element={<BatchReviewPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/batches" replace />} />
    </Routes>
  );
}
