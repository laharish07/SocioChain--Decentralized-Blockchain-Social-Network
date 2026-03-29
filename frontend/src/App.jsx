import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Web3Provider } from "./context/Web3Context";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Layout     from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import FeedPage   from "./pages/FeedPage";
import ExplorePage from "./pages/ExplorePage";
import ProfilePage from "./pages/ProfilePage";
import PostPage    from "./pages/PostPage";
import GroupsPage  from "./pages/GroupsPage";
import MessagesPage from "./pages/MessagesPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/feed" replace /> : <LandingPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/feed"       element={<FeedPage />} />
        <Route path="/explore"    element={<ExplorePage />} />
        <Route path="/profile/:address" element={<ProfilePage />} />
        <Route path="/post/:id"   element={<PostPage />} />
        <Route path="/groups"     element={<GroupsPage />} />
        <Route path="/messages"   element={<MessagesPage />} />
        <Route path="/messages/:address" element={<MessagesPage />} />
        <Route path="/settings"   element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}
