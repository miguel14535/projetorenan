# Banco de dados — criação manual

As migrations automáticas do Supabase foram removidas da pasta `supabase/migrations`
(o projeto não vai mais tentar criar as tabelas sozinho).

Os arquivos `.sql` aqui dentro são só uma **referência** do que existia antes:

- `01_estrutura_completa.sql` — cria as tabelas `profiles`, `people`, `transactions`,
  `appointments`, `debts`, com RLS e políticas de acesso.
- `02_ajuste_preferred_mode.sql` — renomeia a coluna `role` para `preferred_mode`.

## Como criar o banco do seu jeito

1. Entre no seu projeto em https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Escreva (ou cole, se quiser usar como base) o SQL das suas tabelas e rode
4. Garanta que os nomes de tabelas/colunas batem com o que o app espera — veja
   `src/types/database.ts` para a lista de campos que o código usa

O app continua apontando para o Supabase configurado em `.env`
(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). Assim que as tabelas existirem
com os mesmos nomes, tudo volta a funcionar normalmente.
