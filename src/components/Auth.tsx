import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Calendar, Users, Shield, Eye, EyeOff } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError('Email ou senha incorretos');
      } else {
        const { error } = await signUp(email, password, name, whatsapp);
        if (error) setError(error.message);
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FinanceFlow</h1>
          <p className="text-slate-400">Gestao financeira simplificada</p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-white">Modo Simples</h3>
            <p className="text-xs text-slate-400 mt-1">Visualizacao basica</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-sm font-medium text-white">Modo Completo</h3>
            <p className="text-xs text-slate-400 mt-1">Balanco detalhado</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Registrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all pr-12"
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  WhatsApp (opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all pl-12"
                    placeholder="+55 11 99999-9999"
                  />
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Para receber notificacoes de compromissos
                </p>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {!isLogin && (
            <p className="text-center text-xs text-slate-500 mt-4">
              Apos criar a conta, voce podera alternar entre o Modo Simples e o Modo Completo a qualquer momento.
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">Controle financeiro</p>
          </div>
          <div className="p-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400">Agenda integrada</p>
          </div>
          <div className="p-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">Multi-usuario</p>
          </div>
        </div>
      </div>
    </div>
  );
}
