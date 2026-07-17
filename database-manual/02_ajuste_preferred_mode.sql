/*
# Remover coluna role fixa do perfil

1. Alteracoes
- Remover constraint CHECK da coluna role
- Manter a coluna role como preferencia salva do usuario (opcional)
- Adicionar coluna preferred_mode para salvar a preferencia de visualizacao

2. Notas
- O usuario podera alternar entre modo simples e complexo livremente
- A preferencia sera salva no perfil e no localStorage
*/

-- Remover constraint CHECK existente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Tornar a coluna role opcional e renomear para preferred_mode
ALTER TABLE profiles RENAME COLUMN role TO preferred_mode;

-- Adicionar valor padrao
ALTER TABLE profiles ALTER COLUMN preferred_mode SET DEFAULT 'simple';

-- Adicionar nova constraint para validar valores
ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_mode_check 
  CHECK (preferred_mode IN ('simple', 'complex'));
