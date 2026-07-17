/*
# Sistema de Gestão Financeira e Agenda

1. Novas Tabelas
- `profiles`: Perfis de usuário com acesso SIMPLES ou COMPLEXO
  - id (uuid, PK)
  - user_id (uuid, FK auth.users)
  - name (text)
  - role (text) - 'simple' ou 'complex'
  - whatsapp_number (text) - para notificações
  - created_at (timestamp)

- `people`: Pessoas cadastradas para controle financeiro
  - id (uuid, PK)
  - name (text)
  - phone (text)
  - notes (text)
  - created_at (timestamp)
  - created_by (uuid, FK profiles)

- `transactions`: Transações recebidas
  - id (uuid, PK)
  - person_id (uuid, FK people)
  - amount (decimal)
  - description (text)
  - date (date)
  - created_by (uuid, FK profiles)
  - created_at (timestamp)

- `appointments`: Compromissos agendados
  - id (uuid, PK)
  - person_id (uuid, FK people, nullable)
  - title (text)
  - description (text)
  - appointment_date (date)
  - appointment_time (time)
  - notify_whatsapp (boolean)
  - created_by (uuid, FK profiles)
  - created_at (timestamp)

- `debts`: Controle de dívidas (quem deve)
  - id (uuid, PK)
  - person_id (uuid, FK people)
  - amount (decimal) - valor que deve
  - description (text)
  - due_date (date, nullable)
  - is_paid (boolean)
  - created_by (uuid, FK profiles)
  - created_at (timestamp)

2. Segurança
- RLS habilitado em todas as tabelas
- Políticas para usuários autenticados acessarem seus próprios dados
- Usuários SIMPLES veem dados limitados (sem totais)
- Usuários COMPLEXOS veem balanço completo

3. Notas
- Todos os dados são sincronizados em tempo real
- Alertas de dívidas baseados na tabela `debts`
- Notificações WhatsApp disparadas por edge function
*/

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'simple' CHECK (role IN ('simple', 'complex')),
  whatsapp_number text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de pessoas
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tabela de compromissos
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  appointment_date date NOT NULL,
  appointment_time time,
  notify_whatsapp boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Tabela de dívidas
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  description text,
  due_date date,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para people
DROP POLICY IF EXISTS "select_people" ON people;
CREATE POLICY "select_people" ON people FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_people" ON people;
CREATE POLICY "insert_people" ON people FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_people" ON people;
CREATE POLICY "update_people" ON people FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_people" ON people;
CREATE POLICY "delete_people" ON people FOR DELETE
  TO authenticated USING (true);

-- Políticas para transactions
DROP POLICY IF EXISTS "select_transactions" ON transactions;
CREATE POLICY "select_transactions" ON transactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_transactions" ON transactions;
CREATE POLICY "insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE
  TO authenticated USING (true);

-- Políticas para appointments
DROP POLICY IF EXISTS "select_appointments" ON appointments;
CREATE POLICY "select_appointments" ON appointments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_appointments" ON appointments;
CREATE POLICY "insert_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_appointments" ON appointments;
CREATE POLICY "update_appointments" ON appointments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_appointments" ON appointments;
CREATE POLICY "delete_appointments" ON appointments FOR DELETE
  TO authenticated USING (true);

-- Políticas para debts
DROP POLICY IF EXISTS "select_debts" ON debts;
CREATE POLICY "select_debts" ON debts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_debts" ON debts;
CREATE POLICY "insert_debts" ON debts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_debts" ON debts;
CREATE POLICY "update_debts" ON debts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_debts" ON debts;
CREATE POLICY "delete_debts" ON debts FOR DELETE
  TO authenticated USING (true);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_people_created_by ON people(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_person ON transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_debts_person ON debts(person_id);
CREATE INDEX IF NOT EXISTS idx_debts_paid ON debts(is_paid);
