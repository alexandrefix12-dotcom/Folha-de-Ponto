// ==========================================================================
// PontoFácil Digital - Supabase Integration Client
// Insira suas credenciais do projeto Supabase abaixo:
// ==========================================================================

const SUPABASE_CONFIG = {
  // URL do projeto Supabase
  url: 'https://zbrxfmqqoepcbclqhsze.supabase.co',
  
  // Publishable / Anon Key do projeto Supabase
  anonKey: 'sb_publishable_7IS0Eoa7gBeLs2Fd3csMWQ_jZkfWpIV'
};

// Cores para os avatares automáticos
const AVATAR_COLORS = ['green', 'blue', 'purple', 'orange', 'red'];

// Extrai as iniciais do nome (ex: "João Silva" -> "JS")
function getInitials(name) {
  if (!name) return 'FN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Inicialização do Cliente Supabase
let supabaseClient = null;

function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url && 
         !SUPABASE_CONFIG.url.includes('SUA_URL_SUPABASE_AQUI') &&
         SUPABASE_CONFIG.anonKey && 
         !SUPABASE_CONFIG.anonKey.includes('SUA_ANON_PUBLIC_KEY_AQUI');
}

function getSupabaseClient() {
  if (!supabaseClient && isSupabaseConfigured() && window.supabase) {
    try {
      const cleanUrl = SUPABASE_CONFIG.url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
      supabaseClient = window.supabase.createClient(cleanUrl, SUPABASE_CONFIG.anonKey);
      console.log('✅ Supabase conectado com sucesso!');
    } catch (e) {
      console.error('❌ Erro ao inicializar cliente Supabase:', e);
    }
  }
  return supabaseClient;
}

// 1. Carregar colaboradores da tabela "funcionarios" (nome, cargo, cpf)
async function loadEmployeesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Tenta carregar da tabela "funcionarios"
    const { data: rows, error } = await client
      .from('funcionarios')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar funcionários do Supabase:', error);
      return null;
    }

    if (!rows || rows.length === 0) {
      return [];
    }

    // Mapeia os dados da tabela (nome, cargo, cpf, situacao) para a folha de ponto
    return rows.map((item, index) => {
      const initials = getInitials(item.nome || item.name);
      const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
      const nome = item.nome || item.name || 'Sem Nome';
      const cargo = item.cargo || item.role || 'Geral';
      const cpf = item.cpf || '000.000.000-00';
      const id = String(item.id || item.nome?.toLowerCase().replace(/\s+/g, '-') || `emp-${index}`);
      
      const rawStatus = (item.situacao || item.status_category || item.statusCategory || 'ativo').toLowerCase().trim();
      let statusCat = 'ativo';
      if (rawStatus.includes('demit') || rawStatus.includes('deslig')) {
        statusCat = 'demitido';
      } else if (rawStatus.includes('afast') || rawStatus.includes('inss') || rawStatus.includes('licen')) {
        statusCat = 'afastado';
      } else if (rawStatus.includes('feri')) {
        statusCat = 'ferias';
      }

      let pillLabel = '🟢 Ativo';
      let pillClass = 'regular';
      let tagLabel = 'Ativo';
      let tagClass = 'green';

      if (statusCat === 'afastado') {
        pillLabel = '🟠 Afastado (INSS)';
        pillClass = 'warning';
        tagLabel = 'Afastado';
        tagClass = 'orange';
      } else if (statusCat === 'demitido') {
        pillLabel = '🔴 Demitido / Desligado';
        pillClass = 'danger';
        tagLabel = 'Demitido';
        tagClass = 'red';
      } else if (statusCat === 'ferias') {
        pillLabel = '🌴 Em Férias';
        pillClass = 'blue';
        tagLabel = 'Férias';
        tagClass = 'blue';
      }

      return {
        id: id,
        name: nome,
        initials: initials,
        color: color,
        role: cargo,
        shortRole: cargo,
        dept: item.departamento || item.dept || 'Operacional',
        fullDept: `Departamento - ${item.departamento || item.dept || cargo}`,
        admission: item.admissao || item.admission || '01/01/2024',
        cpf: cpf,
        whatsapp: item.whatsapp || item.telefone || item.celular || '',
        pis: item.pis || '000.00000.00-0',
        matricula: item.matricula || String(index + 1).padStart(4, '0'),
        statusTag: tagLabel,
        statusTagClass: tagClass,
        statusCategory: statusCat,
        statusPillLabel: pillLabel,
        statusPillClass: pillClass,
        days: []
      };
    });
  } catch (err) {
    console.error('Exceção ao carregar do Supabase:', err);
    return null;
  }
}

// 2. Inserir novo funcionário na tabela do Supabase (nome, cargo, cpf, telefone/whatsapp)
async function cadastrarFuncionarioNoSupabase(nome, cargo, cpf, whatsapp = '', situacao = 'ativo') {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Tenta prioritariamente com coluna 'telefone'
    const r1 = await client
      .from('funcionarios')
      .insert([{ nome, cargo, cpf, telefone: whatsapp }])
      .select();
    if (!r1.error && r1.data && r1.data.length > 0) return r1.data;

    // 2. Tenta com coluna 'whatsapp'
    const r2 = await client
      .from('funcionarios')
      .insert([{ nome, cargo, cpf, whatsapp: whatsapp }])
      .select();
    if (!r2.error && r2.data && r2.data.length > 0) return r2.data;

    // 3. Tenta com telefone e situacao
    const r3 = await client
      .from('funcionarios')
      .insert([{ nome, cargo, cpf, telefone: whatsapp, situacao }])
      .select();
    if (!r3.error && r3.data && r3.data.length > 0) return r3.data;

    // 4. Fallback básico
    const fallback = await client
      .from('funcionarios')
      .insert([{ nome, cargo, cpf }])
      .select();
    return fallback.data;
  } catch (err) {
    console.error('Exceção ao cadastrar funcionário:', err);
    return null;
  }
}

// 3. Atualizar funcionário existente no Supabase (nome, cargo, cpf, telefone/whatsapp, situacao)
async function atualizarFuncionarioNoSupabase(idOrCpf, updates) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const nomeVal = updates.name || updates.nome;
    const cargoVal = updates.role || updates.cargo;
    const cpfVal = updates.cpf;
    const whatsVal = updates.whatsapp || updates.telefone || '';
    const situacaoVal = updates.statusCategory || updates.situacao || 'ativo';

    const applyFilter = (q) => {
      if (typeof idOrCpf === 'string' && idOrCpf.length === 36 && idOrCpf.includes('-')) {
        return q.eq('id', idOrCpf);
      } else if (cpfVal) {
        return q.eq('cpf', cpfVal);
      } else {
        return q.eq('nome', nomeVal);
      }
    };

    // Tentativa 1: atualiza prioritariamente com coluna 'telefone'
    const p1 = { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, telefone: whatsVal };
    const res1 = await applyFilter(client.from('funcionarios').update(p1)).select();
    if (!res1.error && res1.data && res1.data.length > 0) return res1.data;

    // Tentativa 2: atualiza com coluna 'whatsapp'
    const p2 = { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, whatsapp: whatsVal };
    const res2 = await applyFilter(client.from('funcionarios').update(p2)).select();
    if (!res2.error && res2.data && res2.data.length > 0) return res2.data;

    // Tentativa 3: atualiza completo com telefone e situacao
    const p3 = { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, telefone: whatsVal, situacao: situacaoVal };
    const res3 = await applyFilter(client.from('funcionarios').update(p3)).select();
    if (!res3.error && res3.data && res3.data.length > 0) return res3.data;

    // Tentativa 4: fallback básico
    const p4 = { nome: nomeVal, cargo: cargoVal, cpf: cpfVal };
    const res4 = await applyFilter(client.from('funcionarios').update(p4)).select();
    return res4.data;
  } catch (err) {
    console.warn('Exceção ao atualizar no Supabase:', err);
    return null;
  }
}

// 4. Salvar folha de ponto completa de um funcionário para o mês especificado
async function saveFullTimesheetToSupabase(empId, monthKey, days) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('folha_pontos')
      .upsert({
        funcionario_id: empId,
        mes_ano: monthKey,
        registros: days,
        updated_at: new Date().toISOString()
      }, { onConflict: 'funcionario_id,mes_ano' });

    if (error) {
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

// 5. Excluir funcionário no Supabase (por ID ou CPF)
async function excluirFuncionarioNoSupabase(idOrCpf) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('funcionarios').delete();
    if (typeof idOrCpf === 'string' && idOrCpf.length === 36 && idOrCpf.includes('-')) {
      query = query.eq('id', idOrCpf);
    } else if (idOrCpf) {
      query = query.eq('cpf', idOrCpf);
    }
    const { data, error } = await query;
    return !error;
  } catch (err) {
    console.warn('Erro ao excluir no Supabase:', err);
    return false;
  }
}

// Exportar globalmente
window.supabaseService = {
  config: SUPABASE_CONFIG,
  isConfigured: isSupabaseConfigured,
  getClient: getSupabaseClient,
  loadEmployees: loadEmployeesFromSupabase,
  cadastrarFuncionario: cadastrarFuncionarioNoSupabase,
  atualizarFuncionario: atualizarFuncionarioNoSupabase,
  saveFullTimesheet: saveFullTimesheetToSupabase,
  excluirFuncionario: excluirFuncionarioNoSupabase
};
