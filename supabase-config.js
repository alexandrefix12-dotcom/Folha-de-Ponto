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

// Helper para converter item do banco em objeto funcionário completo
function mapRowToEmployee(item, index = 0) {
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

  // Parse signatures
  let signatures = {};
  if (item.assinaturas && typeof item.assinaturas === 'object') {
    signatures = item.assinaturas;
  } else if (item.signatures && typeof item.signatures === 'object') {
    signatures = item.signatures;
  } else if (typeof item.assinaturas === 'string') {
    try { signatures = JSON.parse(item.assinaturas); } catch (e) {}
  } else if (typeof item.signatures === 'string') {
    try { signatures = JSON.parse(item.signatures); } catch (e) {}
  }

  // Parse timesheets
  let timesheets = {};
  if (item.timesheets && typeof item.timesheets === 'object') {
    timesheets = item.timesheets;
  } else if (typeof item.timesheets === 'string') {
    try { timesheets = JSON.parse(item.timesheets); } catch (e) {}
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
    signatures: signatures,
    digitalSignature: item.digital_signature || item.digitalSignature || null,
    timesheets: timesheets,
    days: []
  };
}

// 1. Carregar colaboradores da tabela "funcionarios" (nome, cargo, cpf, assinaturas)
async function loadEmployeesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
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

    return rows.map((item, index) => mapRowToEmployee(item, index));
  } catch (err) {
    console.error('Exceção ao carregar do Supabase:', err);
    return null;
  }
}

// 1b. Carregar um único colaborador por ID ou CPF
async function loadEmployeeByIdFromSupabase(idOrCpf) {
  const client = getSupabaseClient();
  if (!client || !idOrCpf) return null;

  try {
    let query = client.from('funcionarios').select('*');
    const cleanCpf = String(idOrCpf).replace(/\D/g, '');
    
    if (typeof idOrCpf === 'string' && idOrCpf.length === 36 && idOrCpf.includes('-')) {
      query = query.eq('id', idOrCpf);
    } else if (cleanCpf && cleanCpf.length === 11) {
      query = query.eq('cpf', idOrCpf);
    } else {
      query = query.or(`id.eq.${idOrCpf},cpf.eq.${idOrCpf}`);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return mapRowToEmployee(data, 0);
  } catch (err) {
    console.warn('Erro ao carregar colaborador por ID:', err);
    return null;
  }
}

// 2. Inserir novo funcionário na tabela do Supabase (nome, cargo, cpf, telefone/whatsapp, situacao, dept)
async function cadastrarFuncionarioNoSupabase(nome, cargo, cpf, whatsapp = '', situacao = 'ativo', dept = 'Operacional') {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const attempts = [
      { nome, cargo, cpf, situacao, status_category: situacao, departamento: dept, telefone: whatsapp, whatsapp: whatsapp },
      { nome, cargo, cpf, situacao, status_category: situacao, departamento: dept, whatsapp: whatsapp },
      { nome, cargo, cpf, situacao, telefone: whatsapp },
      { nome, cargo, cpf, situacao, whatsapp: whatsapp },
      { nome, cargo, cpf, situacao },
      { nome, cargo, cpf, status_category: situacao },
      { nome, cargo, cpf, telefone: whatsapp },
      { nome, cargo, cpf, whatsapp: whatsapp },
      { nome, cargo, cpf }
    ];

    for (const payload of attempts) {
      try {
        const res = await client.from('funcionarios').insert([payload]).select();
        if (!res.error && res.data && res.data.length > 0) return res.data;
      } catch (e) {}
    }
    return null;
  } catch (err) {
    console.error('Exceção ao cadastrar funcionário:', err);
    return null;
  }
}

// 3. Atualizar funcionário existente no Supabase (nome, cargo, cpf, telefone/whatsapp, situacao, dept)
async function atualizarFuncionarioNoSupabase(idOrCpf, updates) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const nomeVal = updates.name || updates.nome;
    const cargoVal = updates.role || updates.cargo;
    const cpfVal = updates.cpf;
    const whatsVal = updates.whatsapp || updates.telefone || '';
    const situacaoVal = updates.statusCategory || updates.situacao || 'ativo';
    const deptVal = updates.dept || updates.departamento || '';
    const matVal = updates.matricula || '';
    const admVal = updates.admission || updates.admissao || '';

    const applyFilter = (q) => {
      if (typeof idOrCpf === 'string' && idOrCpf.length === 36 && idOrCpf.includes('-')) {
        return q.eq('id', idOrCpf);
      } else if (cpfVal) {
        return q.eq('cpf', cpfVal);
      } else {
        return q.eq('nome', nomeVal);
      }
    };

    const attempts = [
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, situacao: situacaoVal, status_category: situacaoVal, departamento: deptVal, matricula: matVal, admissao: admVal, telefone: whatsVal, whatsapp: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, situacao: situacaoVal, status_category: situacaoVal, departamento: deptVal, whatsapp: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, situacao: situacaoVal, telefone: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, situacao: situacaoVal, whatsapp: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, situacao: situacaoVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, status_category: situacaoVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, telefone: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal, whatsapp: whatsVal },
      { nome: nomeVal, cargo: cargoVal, cpf: cpfVal }
    ];

    for (const payload of attempts) {
      try {
        const res = await applyFilter(client.from('funcionarios').update(payload)).select();
        if (!res.error && res.data && res.data.length > 0) return res.data;
      } catch (e) {}
    }
    return null;
  } catch (err) {
    console.warn('Exceção ao atualizar no Supabase:', err);
    return null;
  }
}

// 4. Salvar folha de ponto completa de um funcionário para o mês especificado
async function saveFullTimesheetToSupabase(empId, monthKey, days, cpf = '') {
  const client = getSupabaseClient();
  if (!client || !empId) return null;

  try {
    const cleanId = String(empId).trim();
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : '';

    // 1. Salva na tabela folha_pontos
    try {
      await client
        .from('folha_pontos')
        .upsert({
          funcionario_id: cleanId,
          mes_ano: monthKey,
          registros: days,
          updated_at: new Date().toISOString()
        }, { onConflict: 'funcionario_id,mes_ano' });
    } catch (e) {}

    // 2. Salva também na coluna timesheets de funcionarios para redundância
    try {
      const applyFilter = (q) => {
        if (cleanId.length === 36 && cleanId.includes('-')) {
          return q.eq('id', cleanId);
        }
        if (cleanCpf) {
          return q.or(`id.eq.${cleanId},cpf.eq.${cpf},cpf.eq.${cleanCpf}`);
        }
        return q.or(`id.eq.${cleanId},cpf.eq.${cleanId}`);
      };

      const { data: empRows } = await applyFilter(client.from('funcionarios').select('id, timesheets'));
      if (empRows && empRows.length > 0) {
        const empItem = empRows[0];
        let currentTs = empItem.timesheets || {};
        if (typeof currentTs === 'string') {
          try { currentTs = JSON.parse(currentTs); } catch (e) {}
        }
        currentTs[monthKey] = days;
        await client.from('funcionarios').update({ timesheets: currentTs }).eq('id', empItem.id);
      }
    } catch (e) {}

    return true;
  } catch (err) {
    console.warn('Erro ao salvar folha no Supabase:', err);
    return null;
  }
}

// 4b. Carregar folha de ponto / apontamentos de um funcionário do Supabase
async function loadTimesheetFromSupabase(empId, monthKey, cpf = '') {
  const client = getSupabaseClient();
  if (!client || !empId) return null;

  try {
    const cleanId = String(empId).trim();
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : '';

    // 1. Tenta buscar da tabela folha_pontos
    let query = client.from('folha_pontos').select('*').eq('mes_ano', monthKey);
    if (cleanId.length === 36 && cleanId.includes('-')) {
      query = query.eq('funcionario_id', cleanId);
    } else if (cleanCpf) {
      query = query.or(`funcionario_id.eq.${cleanId},funcionario_id.eq.${cleanCpf}`);
    } else {
      query = query.eq('funcionario_id', cleanId);
    }

    const { data: fpRows, error: fpErr } = await query;
    if (!fpErr && fpRows && fpRows.length > 0) {
      const fp = fpRows[0];
      if (fp.registros && Array.isArray(fp.registros) && fp.registros.length > 0) {
        return {
          registros: fp.registros,
          assinatura: fp.assinatura || null,
          assinaturaEmpresa: fp.assinatura_empresa || null
        };
      }
    }

    // 2. Se não achou na tabela folha_pontos, busca na tabela funcionarios
    let empQuery = client.from('funcionarios').select('*');
    if (cleanId.length === 36 && cleanId.includes('-')) {
      empQuery = empQuery.eq('id', cleanId);
    } else if (cleanCpf) {
      empQuery = empQuery.or(`id.eq.${cleanId},cpf.eq.${cpf},cpf.eq.${cleanCpf}`);
    } else {
      empQuery = empQuery.or(`id.eq.${cleanId},cpf.eq.${cleanId}`);
    }

    const { data: empRows, error: empErr } = await empQuery;
    if (!empErr && empRows && empRows.length > 0) {
      const emp = empRows[0];
      let ts = emp.timesheets;
      if (typeof ts === 'string') {
        try { ts = JSON.parse(ts); } catch (e) {}
      }
      if (ts && ts[monthKey] && Array.isArray(ts[monthKey])) {
        let sigs = emp.assinaturas || emp.signatures;
        if (typeof sigs === 'string') {
          try { sigs = JSON.parse(sigs); } catch (e) {}
        }
        return {
          registros: ts[monthKey],
          assinatura: (sigs && sigs[monthKey]) || null
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar folha do Supabase:', err);
  }
  return null;
}

function isUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

// 5. Salvar Assinatura Digital do Funcionário em Tempo Real
async function saveEmployeeSignatureToSupabase(empId, monthKey, signatureObj, cpf = '', name = '') {
  const client = getSupabaseClient();
  if (!client || !empId) return false;

  try {
    const cleanId = String(empId).trim();
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : cleanId.replace(/\D/g, '');

    const applyFilter = (q) => {
      if (isUUID(cleanId)) {
        return q.eq('id', cleanId);
      }
      if (cleanCpf && cleanCpf.length === 11) {
        return q.or(`cpf.eq.${cpf},cpf.eq.${cleanCpf}`);
      }
      if (name) {
        return q.ilike('nome', `%${name}%`);
      }
      return q.eq('cpf', cleanId);
    };

    let currentSignatures = {};
    try {
      const { data: empRows } = await applyFilter(client.from('funcionarios').select('*'));
      if (empRows && empRows.length > 0) {
        const item = empRows[0];
        const raw = item.assinaturas || item.signatures;
        if (raw) {
          currentSignatures = typeof raw === 'string' ? JSON.parse(raw) : { ...raw };
        }
        currentSignatures[monthKey] = signatureObj;
        await client.from('funcionarios').update({ 
          assinaturas: currentSignatures, 
          signatures: currentSignatures 
        }).eq('id', item.id);
      }
    } catch (e) {}

    // Salva também na tabela folha_pontos se existir
    try {
      await client.from('folha_pontos').upsert({
        funcionario_id: cleanId,
        mes_ano: monthKey,
        assinatura: signatureObj,
        updated_at: new Date().toISOString()
      }, { onConflict: 'funcionario_id,mes_ano' });
    } catch (e) {}

    return true;
  } catch (err) {
    console.warn('Erro ao gravar assinatura no Supabase:', err);
    return false;
  }
}

// 5b. Excluir/Limpar Assinatura Digital do Funcionário no Supabase
async function deleteEmployeeSignatureFromSupabase(empId, monthKey, cpf = '', name = '') {
  const client = getSupabaseClient();
  if (!client || !empId) return false;

  try {
    const cleanId = String(empId).trim();
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : cleanId.replace(/\D/g, '');

    const applyFilter = (q) => {
      if (isUUID(cleanId)) {
        return q.eq('id', cleanId);
      }
      if (cleanCpf && cleanCpf.length === 11) {
        return q.or(`cpf.eq.${cpf},cpf.eq.${cleanCpf}`);
      }
      if (name) {
        return q.ilike('nome', `%${name}%`);
      }
      return q.eq('cpf', cleanId);
    };

    // 1. Remove da tabela funcionarios (coluna assinaturas e signatures)
    try {
      const { data: empRows } = await applyFilter(client.from('funcionarios').select('id, assinaturas, signatures'));
      if (empRows && empRows.length > 0) {
        for (const item of empRows) {
          let sigs = item.assinaturas || item.signatures || {};
          if (typeof sigs === 'string') {
            try { sigs = JSON.parse(sigs); } catch (e) {}
          }
          if (sigs && typeof sigs === 'object') {
            delete sigs[monthKey];
          }
          await client.from('funcionarios').update({ 
            assinaturas: sigs, 
            signatures: sigs 
          }).eq('id', item.id);
        }
      }
    } catch (e) {
      console.warn('Aviso ao limpar assinaturas em funcionarios:', e);
    }

    // 2. Remove/Nula na tabela folha_pontos
    try {
      const targets = [cleanId];
      if (cleanCpf && cleanCpf.length === 11) targets.push(cleanCpf);
      if (cpf && !targets.includes(cpf)) targets.push(cpf);

      for (const tId of targets) {
        try {
          await client.from('folha_pontos')
            .update({ assinatura: null, updated_at: new Date().toISOString() })
            .eq('funcionario_id', tId)
            .eq('mes_ano', monthKey);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Aviso ao anular assinatura em folha_pontos:', e);
    }

    return true;
  } catch (err) {
    console.warn('Erro ao excluir assinatura do funcionário no Supabase:', err);
    return false;
  }
}

// 6. Excluir funcionário no Supabase (por ID ou CPF)
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

// 7. Salvar Assinatura Digital do Empregador (Empresa) no Supabase
async function saveCompanySignatureToSupabase(companySigObj) {
  const client = getSupabaseClient();
  if (!client || !companySigObj) return false;

  try {
    await client.from('folha_pontos').upsert({
      funcionario_id: 'empresa-padrao',
      mes_ano: 'geral',
      assinatura_empresa: companySigObj,
      updated_at: new Date().toISOString()
    }, { onConflict: 'funcionario_id,mes_ano' });

    return true;
  } catch (err) {
    console.warn('Erro ao gravar assinatura da empresa no Supabase:', err);
    return false;
  }
}

// 8. Carregar Assinatura Digital do Empregador (Empresa) do Supabase
async function loadCompanySignatureFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('folha_pontos')
      .select('assinatura_empresa')
      .eq('funcionario_id', 'empresa-padrao')
      .eq('mes_ano', 'geral')
      .maybeSingle();

    if (error || !data || !data.assinatura_empresa) return null;
    return data.assinatura_empresa;
  } catch (err) {
    return null;
  }
}

// 9. Excluir Assinatura Digital do Empregador (Empresa) do Supabase
async function deleteCompanySignatureFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    await client.from('folha_pontos').delete().eq('funcionario_id', 'empresa-padrao');
    return true;
  } catch (err) {
    return false;
  }
}

// Exportar globalmente
window.supabaseService = {
  config: SUPABASE_CONFIG,
  isConfigured: isSupabaseConfigured,
  getClient: getSupabaseClient,
  loadEmployees: loadEmployeesFromSupabase,
  loadEmployeeById: loadEmployeeByIdFromSupabase,
  cadastrarFuncionario: cadastrarFuncionarioNoSupabase,
  atualizarFuncionario: atualizarFuncionarioNoSupabase,
  saveFullTimesheet: saveFullTimesheetToSupabase,
  loadTimesheet: loadTimesheetFromSupabase,
  saveEmployeeSignature: saveEmployeeSignatureToSupabase,
  deleteEmployeeSignature: deleteEmployeeSignatureFromSupabase,
  saveCompanySignature: saveCompanySignatureToSupabase,
  loadCompanySignature: loadCompanySignatureFromSupabase,
  deleteCompanySignature: deleteCompanySignatureFromSupabase,
  excluirFuncionario: excluirFuncionarioNoSupabase
};
