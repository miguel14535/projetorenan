import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Person, Transaction, Debt, Appointment, PersonInsert, TransactionInsert, DebtInsert, AppointmentInsert } from '../types/database';
import {
  Plus, Users, Calendar, AlertCircle, Phone, Clock, Trash2, Check, MessageCircle,
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Download, Eye, EyeOff, Shield, Edit2
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { buildAppointmentMessage, sendWhatsAppMessage } from '../lib/whatsapp';

interface PersonWithStats extends Person {
  total_received: number;
  total_owes: number;
  net_balance: number;
}

export function ComplexDashboard() {
  const { user, profile, signOut, viewMode, toggleViewMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'debts' | 'appointments' | 'people'>('overview');
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaidDebts, setTotalPaidDebts] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [peopleStats, setPeopleStats] = useState<PersonWithStats[]>([]);

  // Modal states
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Edit states
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form states
  const [newPerson, setNewPerson] = useState<PersonInsert>({ name: '', phone: '', notes: '', created_by: '' });
  const [newTransaction, setNewTransaction] = useState<TransactionInsert>({
    person_id: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0], created_by: ''
  });
  const [newDebt, setNewDebt] = useState<DebtInsert>({
    person_id: '', amount: 0, description: '', due_date: '', is_paid: false, created_by: ''
  });
  const [newAppointment, setNewAppointment] = useState<AppointmentInsert>({
    person_id: '', title: '', description: '', appointment_date: '', appointment_time: '', notify_whatsapp: false, created_by: ''
  });

  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');

  useEffect(() => {
    if (user && profile) {
      loadData();
    }
  }, [user, profile]);

  useEffect(() => {
    calculateStats();
  }, [transactions, debts, people]);

  async function loadData() {
    setLoading(true);
    const [peopleRes, transactionsRes, debtsRes, appointmentsRes] = await Promise.all([
      supabase.from('people').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*, person:people(*)').order('date', { ascending: false }),
      supabase.from('debts').select('*, person:people(*)').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*, person:people(*)').order('appointment_date', { ascending: true }),
    ]);

    if (peopleRes.data) setPeople(peopleRes.data);
    if (transactionsRes.data) setTransactions(transactionsRes.data);
    if (debtsRes.data) setDebts(debtsRes.data);
    if (appointmentsRes.data) setAppointments(appointmentsRes.data);
    setLoading(false);
  }

  function calculateStats() {
    const received = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    setTotalReceived(received);

    const owed = debts.filter(d => !d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
    setTotalOwed(owed);

    const paid = debts.filter(d => d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
    setTotalPaidDebts(paid);

    setNetBalance(received - owed);

    const stats: PersonWithStats[] = people.map(person => {
      const personTransactions = transactions.filter(tx => tx.person_id === person.id);
      const personDebts = debts.filter(d => d.person_id === person.id && !d.is_paid);

      const personReceived = personTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const personOwes = personDebts.reduce((sum, d) => sum + Number(d.amount), 0);

      return {
        ...person,
        total_received: personReceived,
        total_owes: personOwes,
        net_balance: personReceived - personOwes,
      };
    });
    setPeopleStats(stats);
  }

  // Person functions
  async function addPerson() {
    if (!profile || !newPerson.name) return;
    const { error } = await supabase.from('people').insert({
      ...newPerson,
      created_by: profile.id,
    });
    if (!error) {
      setShowPersonModal(false);
      setNewPerson({ name: '', phone: '', notes: '', created_by: '' });
      loadData();
    }
  }

  async function updatePerson() {
    if (!editingPerson) return;
    const { error } = await supabase.from('people').update({
      name: editingPerson.name,
      phone: editingPerson.phone,
      notes: editingPerson.notes,
    }).eq('id', editingPerson.id);
    if (!error) {
      setEditingPerson(null);
      loadData();
    }
  }

  async function deletePerson(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) return;
    await supabase.from('people').delete().eq('id', id);
    loadData();
  }

  // Transaction functions
  async function addTransaction() {
    if (!profile || !newTransaction.person_id) return;
    const { error } = await supabase.from('transactions').insert({
      ...newTransaction,
      created_by: profile.id,
    });
    if (!error) {
      setShowTransactionModal(false);
      setNewTransaction({ person_id: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0], created_by: '' });
      loadData();
    }
  }

  async function updateTransaction() {
    if (!editingTransaction) return;
    const { error } = await supabase.from('transactions').update({
      person_id: editingTransaction.person_id,
      amount: editingTransaction.amount,
      description: editingTransaction.description,
      date: editingTransaction.date,
    }).eq('id', editingTransaction.id);
    if (!error) {
      setEditingTransaction(null);
      loadData();
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('Excluir esta transacao?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    loadData();
  }

  // Debt functions
  async function addDebt() {
    if (!profile || !newDebt.person_id) return;
    const { error } = await supabase.from('debts').insert({
      ...newDebt,
      created_by: profile.id,
    });
    if (!error) {
      setShowDebtModal(false);
      setNewDebt({ person_id: '', amount: 0, description: '', due_date: '', is_paid: false, created_by: '' });
      loadData();
    }
  }

  async function updateDebt() {
    if (!editingDebt) return;
    const { error } = await supabase.from('debts').update({
      person_id: editingDebt.person_id,
      amount: editingDebt.amount,
      description: editingDebt.description,
      due_date: editingDebt.due_date,
      is_paid: editingDebt.is_paid,
    }).eq('id', editingDebt.id);
    if (!error) {
      setEditingDebt(null);
      loadData();
    }
  }

  async function deleteDebt(id: string) {
    if (!confirm('Excluir esta divida?')) return;
    await supabase.from('debts').delete().eq('id', id);
    loadData();
  }

  async function markDebtPaid(id: string) {
    await supabase.from('debts').update({ is_paid: true }).eq('id', id);
    loadData();
  }

  // Appointment functions
  async function addAppointment() {
    if (!profile || !newAppointment.title) return;
    const { error } = await supabase.from('appointments').insert({
      ...newAppointment,
      created_by: profile.id,
    });
    if (!error) {
      setShowAppointmentModal(false);
      setNewAppointment({ person_id: '', title: '', description: '', appointment_date: '', appointment_time: '', notify_whatsapp: false, created_by: '' });
      loadData();
    }
  }

  async function updateAppointment() {
    if (!editingAppointment) return;
    const { error } = await supabase.from('appointments').update({
      person_id: editingAppointment.person_id,
      title: editingAppointment.title,
      description: editingAppointment.description,
      appointment_date: editingAppointment.appointment_date,
      appointment_time: editingAppointment.appointment_time,
      notify_whatsapp: editingAppointment.notify_whatsapp,
    }).eq('id', editingAppointment.id);
    if (!error) {
      setEditingAppointment(null);
      loadData();
    }
  }

  async function deleteAppointment(id: string) {
    if (!confirm('Excluir este compromisso?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    loadData();
  }

  // Send WhatsApp notification (abre o WhatsApp com a mensagem pronta - funciona sem nenhuma API key)
  function sendWhatsAppNotification(appointment: Appointment) {
    const person = people.find(p => p.id === appointment.person_id);
    const message = buildAppointmentMessage([{ ...appointment, person }]);
    const phone = person?.phone || profile?.whatsapp_number;

    const opened = sendWhatsAppMessage(phone, message);
    if (!opened) {
      alert('Nenhum numero de WhatsApp cadastrado para essa pessoa ou para o seu perfil.');
    }
  }

  const unpaidDebts = debts.filter(d => !d.is_paid);
  const paidDebts = debts.filter(d => d.is_paid);

  const filterByDate = (date: string) => {
    const today = new Date();
    const itemDate = new Date(date);

    switch (dateFilter) {
      case 'today':
        return itemDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return itemDate >= monthAgo;
      default:
        return true;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const passesDateFilter = filterByDate(tx.date);
    const passesPersonFilter = selectedPersonFilter === 'all' || tx.person_id === selectedPersonFilter;
    return passesDateFilter && passesPersonFilter;
  });

  function exportToCSV(type: 'transactions' | 'debts') {
    let csv = '';
    if (type === 'transactions') {
      csv = 'Data,Pessoa,Valor,Descricao\n';
      transactions.forEach(tx => {
        csv += `${tx.date},${(tx.person as Person)?.name},${tx.amount},${tx.description || ''}\n`;
      });
    } else {
      csv = 'Pessoa,Valor,Pago,Descricao,Vencimento\n';
      debts.forEach(d => {
        csv += `${(d.person as Person)?.name},${d.amount},${d.is_paid ? 'Sim' : 'Nao'},${d.description || ''},${d.due_date || ''}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">FinanceFlow</h1>
            <p className="text-sm text-cyan-400">Modo Completo - Balanco Geral</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleViewMode}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg text-sm font-medium text-emerald-400 transition-colors"
              title="Alternar para Modo Simples"
            >
              <EyeOff className="w-4 h-4" />
              <span className="hidden sm:inline">Modo Simples</span>
            </button>
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-white">{profile?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">Total Recebido</p>
                <p className="text-3xl font-mono text-white mt-1">R$ {totalReceived.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-sm font-medium">Total a Receber</p>
                <p className="text-3xl font-mono text-white mt-1">R$ {totalOwed.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Dividas Pagas</p>
                <p className="text-3xl font-mono text-white mt-1">R$ {totalPaidDebts.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30' : 'from-red-500/20 to-red-600/10 border-red-500/30'} border rounded-xl p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${netBalance >= 0 ? 'text-cyan-400' : 'text-red-400'} text-sm font-medium`}>Saldo Liquido</p>
                <p className="text-3xl font-mono text-white mt-1">R$ {netBalance.toFixed(2)}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${netBalance >= 0 ? 'bg-cyan-500/30' : 'bg-red-500/30'} flex items-center justify-center`}>
                <BarChart3 className={`w-6 h-6 ${netBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-800 rounded-xl w-fit overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>Visao Geral</button>
          <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>Transacoes</button>
          <button onClick={() => setActiveTab('debts')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'debts' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}>Dividas</button>
          <button onClick={() => setActiveTab('appointments')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}>Agenda</button>
          <button onClick={() => setActiveTab('people')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'people' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>Pessoas</button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          {activeTab === 'transactions' && (
            <button onClick={() => { setEditingTransaction(null); setNewTransaction({ person_id: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0], created_by: '' }); setShowTransactionModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium text-white transition-colors">
              <Plus className="w-4 h-4" /> Nova Transacao
            </button>
          )}
          {activeTab === 'debts' && (
            <button onClick={() => { setEditingDebt(null); setNewDebt({ person_id: '', amount: 0, description: '', due_date: '', is_paid: false, created_by: '' }); setShowDebtModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg font-medium text-white transition-colors">
              <Plus className="w-4 h-4" /> Nova Divida
            </button>
          )}
          {activeTab === 'appointments' && (
            <button onClick={() => { setEditingAppointment(null); setNewAppointment({ person_id: '', title: '', description: '', appointment_date: '', appointment_time: '', notify_whatsapp: false, created_by: '' }); setShowAppointmentModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium text-white transition-colors">
              <Plus className="w-4 h-4" /> Novo Compromisso
            </button>
          )}
          {activeTab === 'people' && (
            <button onClick={() => { setEditingPerson(null); setNewPerson({ name: '', phone: '', notes: '', created_by: '' }); setShowPersonModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium text-white transition-colors">
              <Plus className="w-4 h-4" /> Nova Pessoa
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                {unpaidDebts.length > 0 && (
                  <div className="lg:col-span-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <h3 className="font-semibold text-amber-400">Dividas Pendentes</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {unpaidDebts.slice(0, 4).map(debt => (
                        <div key={debt.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                          <div>
                            <span className="text-white font-medium">{(debt.person as Person)?.name}</span>
                            {debt.due_date && <span className="text-xs text-slate-400 block">Vence: {new Date(debt.due_date).toLocaleDateString('pt-BR')}</span>}
                          </div>
                          <span className="text-amber-400 font-mono text-lg">R$ {Number(debt.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Ranking por Pessoa</h3>
                  </div>
                  <div className="space-y-3">
                    {peopleStats.sort((a, b) => b.total_received - a.total_received).slice(0, 5).map(person => (
                      <div key={person.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{person.name}</p>
                            <p className="text-xs text-slate-400">Recebido: R$ {person.total_received.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono ${person.net_balance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>R$ {person.net_balance.toFixed(2)}</p>
                          {person.total_owes > 0 && <p className="text-xs text-slate-400">Devendo: R$ {person.total_owes.toFixed(2)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-white">Atividade Recente</h3>
                  </div>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">{(tx.person as Person)?.name}</p>
                          <p className="text-xs text-slate-400">{tx.description || 'Recebimento'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-mono text-sm">+R$ {Number(tx.amount).toFixed(2)}</p>
                          <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <h3 className="font-semibold text-white">Proximos Compromissos</h3>
                    </div>
                  </div>
                  {appointments.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {appointments.slice(0, 6).map(apt => (
                        <div key={apt.id} className="bg-slate-700/50 rounded-lg p-4">
                          <p className="font-medium text-white">{apt.title}</p>
                          <p className="text-sm text-slate-400 mt-1">{apt.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(apt.appointment_date).toLocaleDateString('pt-BR')}
                            {apt.appointment_time && ` - ${apt.appointment_time}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">Nenhum compromisso agendado</p>
                  )}
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex gap-2">
                    {(['all', 'today', 'week', 'month'] as const).map(df => (
                      <button key={df} onClick={() => setDateFilter(df)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${dateFilter === df ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
                        {df === 'all' ? 'Todas' : df === 'today' ? 'Hoje' : df === 'week' ? 'Semana' : 'Mes'}
                      </button>
                    ))}
                  </div>
                  <select value={selectedPersonFilter} onChange={(e) => setSelectedPersonFilter(e.target.value)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="all">Todas as pessoas</option>
                    {people.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <button onClick={() => exportToCSV('transactions')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors ml-auto">
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhuma transacao encontrada</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Pessoa</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Valor</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Data</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Descricao</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Acoes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {filteredTransactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 text-white">{(tx.person as Person)?.name}</td>
                            <td className="px-4 py-3"><span className="text-emerald-400 font-mono">R$ {Number(tx.amount).toFixed(2)}</span></td>
                            <td className="px-4 py-3 text-slate-400 text-sm">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-slate-400 text-sm">{tx.description || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setEditingTransaction(tx)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteTransaction(tx.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-500/10 border-t border-emerald-500/30">
                        <tr>
                          <td className="px-4 py-3 font-semibold text-white">Total Filtrado</td>
                          <td className="px-4 py-3"><span className="text-emerald-400 font-mono text-lg">R$ {filteredTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0).toFixed(2)}</span></td>
                          <td colSpan={3}></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Debts Tab */}
            {activeTab === 'debts' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button onClick={() => exportToCSV('debts')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">
                    <Download className="w-4 h-4" /> Exportar CSV
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                      <h3 className="font-semibold text-amber-400">Dividas Pendentes</h3>
                      <span className="text-amber-400 font-mono text-lg">R$ {totalOwed.toFixed(2)}</span>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {unpaidDebts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Nenhuma divida pendente</div>
                      ) : (
                        unpaidDebts.map(debt => (
                          <div key={debt.id} className="px-5 py-4 hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-white">{(debt.person as Person)?.name}</p>
                                <p className="text-sm text-slate-400">{debt.description}</p>
                                {debt.due_date && <p className="text-xs text-slate-400 mt-1">Vence: {new Date(debt.due_date).toLocaleDateString('pt-BR')}</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-amber-400 font-mono text-lg">R$ {Number(debt.amount).toFixed(2)}</span>
                                <button onClick={() => setEditingDebt(debt)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => markDebtPaid(debt.id)} className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-400" title="Marcar como pago"><Check className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                      <h3 className="font-semibold text-emerald-400">Dividas Pagas</h3>
                      <span className="text-emerald-400 font-mono text-lg">R$ {totalPaidDebts.toFixed(2)}</span>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {paidDebts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Nenhuma divida paga</div>
                      ) : (
                        paidDebts.map(debt => (
                          <div key={debt.id} className="px-5 py-4 bg-slate-700/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-300">{(debt.person as Person)?.name}</p>
                                <p className="text-sm text-slate-500">{debt.description}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-emerald-400/70 font-mono">R$ {Number(debt.amount).toFixed(2)}</span>
                                <Check className="w-4 h-4 text-emerald-400" />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="grid gap-4">
                {appointments.length === 0 ? (
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">Nenhum compromisso agendado</div>
                ) : (
                  appointments.map(apt => (
                    <div key={apt.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="bg-purple-500/20 rounded-lg p-3">
                            <Calendar className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{apt.title}</h3>
                            <p className="text-sm text-slate-400 mt-1">{apt.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{new Date(apt.appointment_date).toLocaleDateString('pt-BR')}{apt.appointment_time && ` as ${apt.appointment_time}`}</span>
                              {apt.person && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{(apt.person as Person)?.name}</span>}
                              {apt.notify_whatsapp && <span className="flex items-center gap-1 text-emerald-400"><MessageCircle className="w-4 h-4" />WhatsApp</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => sendWhatsAppNotification(apt)} className="p-2 hover:bg-emerald-500/20 rounded-lg transition-colors text-slate-400 hover:text-emerald-400" title="Enviar WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                          <button onClick={() => setEditingAppointment(apt)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteAppointment(apt.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'people' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {peopleStats.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">Nenhuma pessoa cadastrada</div>
                ) : (
                  peopleStats.map(person => (
                    <div key={person.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">{person.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <h3 className="font-semibold text-white">{person.name}</h3>
                            {person.phone && <p className="text-sm text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{person.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingPerson(person)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deletePerson(person.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {person.notes && <p className="text-sm text-slate-400 bg-slate-700/50 rounded-lg p-3 mb-3">{person.notes}</p>}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-emerald-500/10 rounded-lg px-3 py-2"><p className="text-emerald-400 font-mono">R$ {person.total_received.toFixed(2)}</p><p className="text-xs text-slate-500">Recebido</p></div>
                        <div className="bg-amber-500/10 rounded-lg px-3 py-2"><p className="text-amber-400 font-mono">R$ {person.total_owes.toFixed(2)}</p><p className="text-xs text-slate-500">Devendo</p></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400">Saldo:</span>
                          <span className={`font-mono ${person.net_balance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>R$ {person.net_balance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Person Modal */}
      <Modal isOpen={showPersonModal || !!editingPerson} onClose={() => { setShowPersonModal(false); setEditingPerson(null); }} title={editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
            <input type="text" value={editingPerson?.name || newPerson.name} onChange={(e) => editingPerson ? setEditingPerson({ ...editingPerson, name: e.target.value }) : setNewPerson({ ...newPerson, name: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da pessoa" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={editingPerson?.phone || newPerson.phone || ''} onChange={(e) => editingPerson ? setEditingPerson({ ...editingPerson, phone: e.target.value }) : setNewPerson({ ...newPerson, phone: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Observacoes</label>
            <textarea value={editingPerson?.notes || newPerson.notes || ''} onChange={(e) => editingPerson ? setEditingPerson({ ...editingPerson, notes: e.target.value }) : setNewPerson({ ...newPerson, notes: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Observacoes sobre a pessoa" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => { setShowPersonModal(false); setEditingPerson(null); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors">Cancelar</button>
            <button onClick={editingPerson ? updatePerson : addPerson} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium text-white transition-colors">{editingPerson ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal isOpen={showTransactionModal || !!editingTransaction} onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }} title={editingTransaction ? 'Editar Transacao' : 'Nova Transacao'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pessoa</label>
            <select value={editingTransaction?.person_id || newTransaction.person_id} onChange={(e) => editingTransaction ? setEditingTransaction({ ...editingTransaction, person_id: e.target.value }) : setNewTransaction({ ...newTransaction, person_id: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione uma pessoa</option>
              {people.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Valor (R$)</label>
            <input type="number" step="0.01" value={editingTransaction?.amount || newTransaction.amount} onChange={(e) => editingTransaction ? setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) }) : setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Data</label>
            <input type="date" value={editingTransaction?.date || newTransaction.date} onChange={(e) => editingTransaction ? setEditingTransaction({ ...editingTransaction, date: e.target.value }) : setNewTransaction({ ...newTransaction, date: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descricao</label>
            <textarea value={editingTransaction?.description || newTransaction.description || ''} onChange={(e) => editingTransaction ? setEditingTransaction({ ...editingTransaction, description: e.target.value }) : setNewTransaction({ ...newTransaction, description: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" rows={2} placeholder="Observacoes" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => { setShowTransactionModal(false); setEditingTransaction(null); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors">Cancelar</button>
            <button onClick={editingTransaction ? updateTransaction : addTransaction} className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium text-white transition-colors">{editingTransaction ? 'Salvar' : 'Registrar'}</button>
          </div>
        </div>
      </Modal>

      {/* Debt Modal */}
      <Modal isOpen={showDebtModal || !!editingDebt} onClose={() => { setShowDebtModal(false); setEditingDebt(null); }} title={editingDebt ? 'Editar Divida' : 'Nova Divida'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pessoa</label>
            <select value={editingDebt?.person_id || newDebt.person_id} onChange={(e) => editingDebt ? setEditingDebt({ ...editingDebt, person_id: e.target.value }) : setNewDebt({ ...newDebt, person_id: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Selecione uma pessoa</option>
              {people.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Valor que deve (R$)</label>
            <input type="number" step="0.01" value={editingDebt?.amount || newDebt.amount} onChange={(e) => editingDebt ? setEditingDebt({ ...editingDebt, amount: parseFloat(e.target.value) }) : setNewDebt({ ...newDebt, amount: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Data de vencimento</label>
            <input type="date" value={editingDebt?.due_date || newDebt.due_date || ''} onChange={(e) => editingDebt ? setEditingDebt({ ...editingDebt, due_date: e.target.value }) : setNewDebt({ ...newDebt, due_date: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descricao</label>
            <textarea value={editingDebt?.description || newDebt.description || ''} onChange={(e) => editingDebt ? setEditingDebt({ ...editingDebt, description: e.target.value }) : setNewDebt({ ...newDebt, description: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" rows={2} placeholder="Observacoes" />
          </div>
          {editingDebt && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={editingDebt.is_paid} onChange={(e) => setEditingDebt({ ...editingDebt, is_paid: e.target.checked })} className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-700" />
              <span className="text-sm text-white">Marcar como pago</span>
            </label>
          )}
          <div className="flex gap-3 pt-4">
            <button onClick={() => { setShowDebtModal(false); setEditingDebt(null); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors">Cancelar</button>
            <button onClick={editingDebt ? updateDebt : addDebt} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg font-medium text-white transition-colors">{editingDebt ? 'Salvar' : 'Registrar'}</button>
          </div>
        </div>
      </Modal>

      {/* Appointment Modal */}
      <Modal isOpen={showAppointmentModal || !!editingAppointment} onClose={() => { setShowAppointmentModal(false); setEditingAppointment(null); }} title={editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Titulo</label>
            <input type="text" value={editingAppointment?.title || newAppointment.title} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, title: e.target.value }) : setNewAppointment({ ...newAppointment, title: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Titulo do compromisso" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Pessoa</label>
            <select value={editingAppointment?.person_id || newAppointment.person_id || ''} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, person_id: e.target.value || null }) : setNewAppointment({ ...newAppointment, person_id: e.target.value || null })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Nenhuma pessoa especifica</option>
              {people.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data</label>
              <input type="date" value={editingAppointment?.appointment_date || newAppointment.appointment_date} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, appointment_date: e.target.value }) : setNewAppointment({ ...newAppointment, appointment_date: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Hora</label>
              <input type="time" value={editingAppointment?.appointment_time || newAppointment.appointment_time || ''} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, appointment_time: e.target.value }) : setNewAppointment({ ...newAppointment, appointment_time: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descricao</label>
            <textarea value={editingAppointment?.description || newAppointment.description || ''} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, description: e.target.value }) : setNewAppointment({ ...newAppointment, description: e.target.value })} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" rows={2} placeholder="Detalhes do compromisso" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={editingAppointment?.notify_whatsapp ?? newAppointment.notify_whatsapp} onChange={(e) => editingAppointment ? setEditingAppointment({ ...editingAppointment, notify_whatsapp: e.target.checked }) : setNewAppointment({ ...newAppointment, notify_whatsapp: e.target.checked })} className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-700" />
            <div>
              <span className="text-sm text-white">Enviar lembrete via WhatsApp</span>
              <p className="text-xs text-slate-400">No dia anterior ao compromisso</p>
            </div>
          </label>
          <div className="flex gap-3 pt-4">
            <button onClick={() => { setShowAppointmentModal(false); setEditingAppointment(null); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors">Cancelar</button>
            <button onClick={editingAppointment ? updateAppointment : addAppointment} className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium text-white transition-colors">{editingAppointment ? 'Salvar' : 'Agendar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
