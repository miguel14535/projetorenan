import { AuthProvider, useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { SimpleDashboard } from './components/SimpleDashboard';
import { ComplexDashboard } from './components/ComplexDashboard';

function AppContent() {
  const { user, profile, loading, viewMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth />;
  }

  if (viewMode === 'simple') {
    return <SimpleDashboard />;
  }

  return <ComplexDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
