-- ==========================================================================
-- TABELA SIMPLIFICADA: FUNCIONÁRIOS (nome, cargo, cpf)
-- Execute este script no SQL Editor do seu Supabase
-- ==========================================================================

-- 1. Criar a tabela com as 3 colunas solicitadas:
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cargo TEXT NOT NULL,
    cpf TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar acesso (RLS):
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em funcionarios" ON public.funcionarios;
CREATE POLICY "Permitir tudo em funcionarios"
    ON public.funcionarios FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Adicionar colunas de situação contratual e departamento (caso deseje salvar diretamente nas colunas do banco):
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS situacao TEXT DEFAULT 'ativo';
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS status_category TEXT DEFAULT 'ativo';
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS departamento TEXT;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS admissao TEXT DEFAULT '01/01/2024';
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS matricula TEXT;
