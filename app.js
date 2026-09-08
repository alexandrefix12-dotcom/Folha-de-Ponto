// ==========================================================================
// PontoFácil Digital — Business Logic & Multi-Employee Timesheet Engine
// Portaria MTE 671 / CLT — Gestão Multi-Período
// ==========================================================================

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const _initialNow = new Date();
let currentYear = _initialNow.getFullYear();
let currentMonth = _initialNow.getMonth() + 1; // 1-12 (Mês atual em tempo real)

// Feriados Nacionais Brasileiros (dia-mês)
const BRAZIL_HOLIDAYS = {
  '1-1': 'Confraternização Universal (Lei 10.607)',
  '21-4': 'Tiradentes (Lei 10.607)',
  '1-5': 'Dia Mundial do Trabalho (Lei 10.607)',
  '7-9': 'Independência do Brasil (Lei 10.607)',
  '12-10': 'Nossa Sra. Aparecida (Lei 6.802)',
  '2-11': 'Finados (Lei 10.607)',
  '15-11': 'Proclamação da República (Lei 10.607)',
  '20-11': 'Dia da Consciência Negra (Lei 14.759)',
  '25-12': 'Natal (Lei 10.607)'
};

// Gerador dinâmico de dias para qualquer mês/ano (passado, presente e futuro)
// Não preenche informações aleatórias/automáticas: os dias úteis iniciam em branco para preenchimento manual ao fim do mês
function generateMonthData(year, month, empId = '') {
  const dows = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const numDays = new Date(year, month, 0).getDate();
  const list = [];

  let isFerias = false;
  let isAfastado = false;
  let targetEmp = null;

  try {
    if (typeof employeesDB !== 'undefined' && Array.isArray(employeesDB) && employeesDB.length > 0) {
      targetEmp = employeesDB.find(e => e && e.id === empId);
      if (targetEmp) {
        isFerias = targetEmp.statusCategory === 'ferias';
        isAfastado = targetEmp.statusCategory === 'afastado';
      }
    }
  } catch (err) {
    // Ignora durante a inicialização do array
  }

  for (let day = 1; day <= numDays; day++) {
    const date = new Date(year, month - 1, day);
    const dowIndex = date.getDay();
    const dow = dows[dowIndex];
    const holidayKey = `${day}-${month}`;
    const curDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isDayInVacation = targetEmp && targetEmp.vacationStart && targetEmp.vacationEnd && (curDateStr >= targetEmp.vacationStart && curDateStr <= targetEmp.vacationEnd);

    if (isDayInVacation || (isFerias && (!targetEmp || !targetEmp.vacationStart))) {
      list.push({
        day, dow,
        e1: '', s1: '', e2: '', s2: '',
        status: 'ferias',
        statusLabel: 'Férias Regulamentares',
        just: `Férias Regulamentares (${(targetEmp && targetEmp.vacationDays) || 30} dias)`,
        signed: true
      });
    } else if (isAfastado) {
      list.push({
        day, dow,
        e1: '', s1: '', e2: '', s2: '',
        status: 'atestado',
        statusLabel: 'Afastamento / INSS',
        just: 'Afastamento INSS / Licença Médica',
        signed: true
      });
    } else {
      // Padrão: Presença para todos os dias
      list.push({
        day, dow,
        e1: '', s1: '', e2: '', s2: '',
        status: 'presenca',
        statusLabel: 'Presença',
        just: '',
        signed: false
      });
    }
  }
  return list;
}

function generateCurrentMonthData(year = currentYear, month = currentMonth, empId = '') {
  return generateMonthData(year, month, empId);
}

// Complete Employee Database with individual timesheets
var employeesDB = [];

let currentEmployeeId = '';

function getCurrentEmployee() {
  if (!employeesDB || employeesDB.length === 0) return null;
  return employeesDB.find(e => e.id === currentEmployeeId) || employeesDB[0];
}

const LOCAL_STORAGE_EMPLOYEES_KEY = 'lane_comunicacoes_employees_db_v5';

function saveEmployeesToLocalStorage() {
  try {
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const listToSave = employeesDB.map(emp => {
      const timesheetsObj = emp.timesheets ? { ...emp.timesheets } : {};
      if (emp.days && Array.isArray(emp.days) && emp.days.length > 0) {
        timesheetsObj[monthKey] = JSON.parse(JSON.stringify(emp.days));
      }
      return {
        id: emp.id,
        name: emp.name,
        initials: emp.initials,
        color: emp.color,
        role: emp.role,
        shortRole: emp.shortRole,
        dept: emp.dept,
        fullDept: emp.fullDept,
        admission: emp.admission,
        cpf: emp.cpf,
        whatsapp: emp.whatsapp || '',
        pis: emp.pis,
        matricula: emp.matricula,
        statusTag: emp.statusTag,
        statusTagClass: emp.statusTagClass,
        statusCategory: emp.statusCategory,
        statusPillLabel: emp.statusPillLabel,
        statusPillClass: emp.statusPillClass,
        vacationStart: emp.vacationStart || null,
        vacationEnd: emp.vacationEnd || null,
        vacationReturn: emp.vacationReturn || null,
        vacationDays: emp.vacationDays || null,
        signatures: emp.signatures || {},
        timesheets: timesheetsObj
      };
    });
    localStorage.setItem(LOCAL_STORAGE_EMPLOYEES_KEY, JSON.stringify(listToSave));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

function loadEmployeesFromLocalStorage() {
  try {
    // Limpa versões anteriores de simulação/mock
    localStorage.removeItem('lane_comunicacoes_employees_db_v4');
    localStorage.removeItem('lane_comunicacoes_employees_db_v3');
    localStorage.removeItem('lane_comunicacoes_employees_db_v2');
    localStorage.removeItem('lane_comunicacoes_employees_db_v1');

    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Exclui mocks de simulação
      const mockIds = ['joao-silva', 'maria-santos', 'carlos-oliveira', 'fernanda-lima', 'ricardo-souza'];
      const filtered = parsed.filter(emp => !mockIds.includes(emp.id));
      return filtered.length > 0 ? filtered : [];
    }
  } catch (e) {
    console.warn('Erro ao carregar do localStorage:', e);
  }
  return null;
}

async function initApp() {
  initScreenNavigation();
  loadSystemSettings();

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // 1. Carregar do localStorage
  const localSaved = loadEmployeesFromLocalStorage();
  if (localSaved && localSaved.length > 0) {
    employeesDB.length = 0;
    localSaved.forEach(emp => {
      if (!emp.timesheets) emp.timesheets = {};
      if (!emp.timesheets[monthKey]) {
        emp.timesheets[monthKey] = generateCurrentMonthData(currentYear, currentMonth, emp.id);
      }
      emp.days = emp.timesheets[monthKey];
      employeesDB.push(emp);
    });
  } else {
    employeesDB.length = 0;
  }

  // 2. Se o Supabase estiver conectado, sincroniza e mescla os dados
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    try {
      const dbEmployees = await window.supabaseService.loadEmployees();
      if (Array.isArray(dbEmployees)) {
        const localCopy = [...employeesDB];
        employeesDB.length = 0;

        dbEmployees.forEach(remoteEmp => {
          const localMatch = localCopy.find(l => l.id === remoteEmp.id || (l.cpf && remoteEmp.cpf && l.cpf.replace(/\D/g, '') === remoteEmp.cpf.replace(/\D/g, '')));
          const mergedTimesheets = localMatch ? { ...(localMatch.timesheets || {}), ...(remoteEmp.timesheets || {}) } : (remoteEmp.timesheets || {});
          
          if (!mergedTimesheets[monthKey]) {
            mergedTimesheets[monthKey] = generateCurrentMonthData(currentYear, currentMonth, remoteEmp.id);
          }

          employeesDB.push({
            ...remoteEmp,
            ...(localMatch || {}),
            name: remoteEmp.name,
            role: remoteEmp.role,
            dept: remoteEmp.dept || (localMatch && localMatch.dept) || 'Operacional',
            cpf: remoteEmp.cpf,
            whatsapp: (localMatch && localMatch.whatsapp) || remoteEmp.whatsapp || '',
            matricula: remoteEmp.matricula || (localMatch && localMatch.matricula) || '',
            admission: remoteEmp.admission || (localMatch && localMatch.admission) || '01/01/2024',
            statusCategory: remoteEmp.statusCategory || (localMatch && localMatch.statusCategory) || 'ativo',
            signatures: (localMatch && localMatch.signatures) || remoteEmp.signatures || {},
            timesheets: mergedTimesheets,
            days: mergedTimesheets[monthKey]
          });
        });

        saveEmployeesToLocalStorage();
        console.log(`✅ Base sincronizada com Supabase: ${employeesDB.length} funcionários.`);
      }
    } catch (err) {
      console.warn('⚠️ Usando base de dados local:', err);
    }
  }

  saveEmployeesToLocalStorage();
  populateQuickEmployeeSelect();
  renderEmployeesAdminTable();
  updateSidebarBadges();
  const firstId = employeesDB[0]?.id || '';
  selectEmployee(firstId, false);

  // Verifica se a URL foi acessada via link de assinatura do WhatsApp (#assinar)
  checkUrlHashForSignature();
  window.addEventListener('hashchange', checkUrlHashForSignature);

  // Sincronização em tempo real quando o colaborador assina em outra aba ou celular
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_STORAGE_EMPLOYEES_KEY) {
      reloadEmployeesFromStorage();
    }
  });
  window.addEventListener('focus', () => {
    reloadEmployeesFromStorage();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      reloadEmployeesFromStorage();
    }
  });
}

// Recarrega em tempo real os funcionários e assinaturas gravadas
function reloadEmployeesFromStorage() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    if (!raw) return;
    const loaded = JSON.parse(raw);
    if (!Array.isArray(loaded) || loaded.length === 0) return;

    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    let hasChanges = false;

    loaded.forEach(remote => {
      const target = employeesDB.find(e => e.id === remote.id || (e.cpf && remote.cpf && e.cpf.replace(/\D/g, '') === remote.cpf.replace(/\D/g, '')));
      if (target) {
        if (JSON.stringify(target.signatures) !== JSON.stringify(remote.signatures) || target.digitalSignature !== remote.digitalSignature) {
          target.signatures = remote.signatures || {};
          target.digitalSignature = remote.digitalSignature || null;
          hasChanges = true;
        }
        if (remote.timesheets && remote.timesheets[monthKey]) {
          target.timesheets = remote.timesheets;
          target.days = remote.timesheets[monthKey];
        }
      }
    });

    const currentEmp = getCurrentEmployee();
    if (currentEmp) {
      updateHeroSignatureBadge(currentEmp);
      renderTimesheetTable();
      renderEmployeesAdminTable();
      updateSidebarBadges();
    }
  } catch (err) {
    console.warn('Erro na sincronização em tempo real:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Screen Switching
function initScreenNavigation() {
  const tabs = document.querySelectorAll('.screen-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const screenId = tab.dataset.screen;
      switchScreen(screenId);
    });
  });
}

function switchScreen(screenId) {
  document.querySelectorAll('.stitch-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.screen-tab').forEach(t => t.classList.remove('active'));

  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add('active');

  const targetTab = document.querySelector(`.screen-tab[data-screen="${screenId}"]`);
  if (targetTab) targetTab.classList.add('active');

  // Update sidebar active link state
  if (screenId === 'screen-admin') {
    const isAfastadosActive = document.getElementById('nav-link-afastados')?.classList.contains('active');
    const isFeriasActive = document.getElementById('nav-link-ferias')?.classList.contains('active');
    if (!isAfastadosActive && !isFeriasActive) {
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      document.getElementById('nav-link-employees')?.classList.add('active');
    }
  } else if (screenId === 'screen-timesheet') {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('nav-link-employees')?.classList.add('active');
  } else if (screenId === 'screen-auditor') {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('nav-link-auditor')?.classList.add('active');
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Populate Quick Employee Select in Hero Card
function populateQuickEmployeeSelect() {
  const select = document.getElementById('emp-quick-select');
  if (!select) return;
  select.innerHTML = '';

  if (employeesDB.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhum funcionário cadastrado';
    select.appendChild(opt);
    return;
  }

  employeesDB.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.dept})`;
    select.appendChild(opt);
  });
}

// Select Employee and load all data dynamically
function selectEmployee(empIdOrName, navigateToTimesheet = false) {
  if (employeesDB.length === 0) {
    currentEmployeeId = '';
    const tabLabel = document.getElementById('tab-emp-name');
    if (tabLabel) tabLabel.textContent = 'Folha de Ponto';

    const avatarEl = document.getElementById('emp-hero-avatar');
    if (avatarEl) { avatarEl.className = 'emp-avatar gray'; avatarEl.textContent = '--'; }

    const nameEl = document.getElementById('emp-hero-name');
    if (nameEl) nameEl.textContent = 'Nenhum funcionário cadastrado';

    const badgeEl = document.getElementById('emp-hero-badge');
    if (badgeEl) { badgeEl.className = 'badge-tag gray'; badgeEl.textContent = 'Sem registros'; }

    const matEl = document.getElementById('emp-hero-matricula');
    if (matEl) matEl.textContent = 'Matrícula: --';

    const roleEl = document.getElementById('emp-hero-role');
    if (roleEl) roleEl.textContent = '--';

    const deptEl = document.getElementById('emp-hero-dept');
    if (deptEl) deptEl.textContent = '--';

    const cpfEl = document.getElementById('emp-hero-cpf');
    if (cpfEl) cpfEl.textContent = '--';

    populateQuickEmployeeSelect();
    renderTimesheetTable();
    recalculateAllTimes();
    return;
  }

  // Salva os inputs atuais do colaborador ativo antes de trocar
  const activeEmp = getCurrentEmployee();
  if (activeEmp && activeEmp.days) {
    const rows = document.querySelectorAll('#timesheet-tbody tr');
    if (rows && rows.length > 0) {
      rows.forEach((row, idx) => {
        if (activeEmp.days[idx]) {
          const e1 = row.querySelector('[data-field="e1"]')?.value;
          const s1 = row.querySelector('[data-field="s1"]')?.value;
          const e2 = row.querySelector('[data-field="e2"]')?.value;
          const s2 = row.querySelector('[data-field="s2"]')?.value;
          const status = row.querySelector('.status-select')?.value;
          const just = row.querySelector('.justification-input')?.value;
          const signed = row.querySelector('.sig-checkbox')?.checked;

          if (e1 !== undefined) activeEmp.days[idx].e1 = e1.trim();
          if (s1 !== undefined) activeEmp.days[idx].s1 = s1.trim();
          if (e2 !== undefined) activeEmp.days[idx].e2 = e2.trim();
          if (s2 !== undefined) activeEmp.days[idx].s2 = s2.trim();
          if (status !== undefined) activeEmp.days[idx].status = status;
          if (just !== undefined) activeEmp.days[idx].just = just.trim();
          if (signed !== undefined) activeEmp.days[idx].signed = signed;
        }
      });
      const activeMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
      if (!activeEmp.timesheets) activeEmp.timesheets = {};
      activeEmp.timesheets[activeMonthKey] = JSON.parse(JSON.stringify(activeEmp.days));
      saveEmployeesToLocalStorage();
    }
  }

  const queryStr = String(empIdOrName || '').toLowerCase().trim();
  const found = employeesDB.find(e => 
    String(e.id).toLowerCase() === queryStr || 
    String(e.name || '').toLowerCase().trim() === queryStr || 
    (e.cpf && e.cpf.replace(/\D/g, '') === queryStr.replace(/\D/g, ''))
  );
  if (found) {
    currentEmployeeId = found.id;
  } else if (employeesDB.length > 0) {
    currentEmployeeId = employeesDB[0].id;
  }

  const emp = getCurrentEmployee();
  if (!emp) return;

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (!emp.timesheets) emp.timesheets = {};
  if (!emp.timesheets[monthKey]) {
    emp.timesheets[monthKey] = generateMonthData(currentYear, currentMonth, emp.id);
  }
  emp.days = emp.timesheets[monthKey];

  // 1. Update Header tab text
  const tabLabel = document.getElementById('tab-emp-name');
  if (tabLabel) tabLabel.textContent = `Folha de Ponto (${emp.name})`;

  // 2. Update Timesheet Hero Card
  const avatarEl = document.getElementById('emp-hero-avatar');
  if (avatarEl) {
    avatarEl.className = `emp-avatar ${emp.color || 'green'}`;
    avatarEl.textContent = emp.initials || 'FN';
  }

  const nameEl = document.getElementById('emp-hero-name');
  if (nameEl) nameEl.textContent = emp.name || 'Funcionário';

  const badgeEl = document.getElementById('emp-hero-badge');
  if (badgeEl) {
    badgeEl.className = `badge-tag ${emp.statusTagClass || 'green'}`;
    badgeEl.textContent = emp.statusTag || 'Ativo';
  }

  const matEl = document.getElementById('emp-hero-matricula');
  if (matEl) matEl.textContent = `Matrícula: ${emp.matricula || '0001'}`;

  const roleEl = document.getElementById('emp-hero-role');
  if (roleEl) roleEl.textContent = emp.role || 'Geral';

  const deptEl = document.getElementById('emp-hero-dept');
  if (deptEl) deptEl.textContent = emp.fullDept || `Departamento - ${emp.role || 'Geral'}`;

  const cpfEl = document.getElementById('emp-hero-cpf');
  if (cpfEl) cpfEl.textContent = emp.cpf || '000.000.000-00';

  const whatsappEl = document.getElementById('emp-hero-whatsapp');
  if (whatsappEl) whatsappEl.textContent = emp.whatsapp || 'Não informado';

  // 3. Update quick selector dropdown & month text
  const quickSelect = document.getElementById('emp-quick-select');
  if (quickSelect) quickSelect.value = emp.id;

  updateMonthDisplay();
  updateHeroSignatureBadge(emp);

  // 4. Render Timesheet & Recalculate Totals
  renderTimesheetTable();
  recalculateAllTimes();

  if (navigateToTimesheet) {
    switchScreen('screen-timesheet');
    showToast(`Folha de ponto de ${emp.name} carregada com sucesso!`);
  }
}

// Update Month & Record Count Display
function updateMonthDisplay() {
  const monthName = MONTH_NAMES[currentMonth - 1];
  const displayEl = document.getElementById('current-month-display-text');
  if (displayEl) {
    displayEl.innerHTML = `${monthName} de ${currentYear} <span style="font-size: 0.72rem; color: #059669; margin-left: 2px;">▾</span>`;
  }

  const emp = getCurrentEmployee();
  const daysCount = emp?.days?.length || new Date(currentYear, currentMonth, 0).getDate();
  const counterEl = document.getElementById('record-counter-text');
  if (counterEl) counterEl.textContent = `(${daysCount} registros no mês de ${monthName})`;
}

// Period Picker Modal Logic
let pickerYear = currentYear;

function openPeriodModal() {
  pickerYear = currentYear;
  renderPeriodModal();
  const modal = document.getElementById('modal-period-picker');
  if (modal) modal.style.display = 'flex';
}

function closePeriodModal() {
  const modal = document.getElementById('modal-period-picker');
  if (modal) modal.style.display = 'none';
}

function changePickerYear(delta) {
  pickerYear += delta;
  renderPeriodModal();
}

function renderPeriodModal() {
  const yearDisplay = document.getElementById('picker-year-display');
  if (yearDisplay) yearDisplay.textContent = pickerYear;

  const grid = document.getElementById('months-picker-grid');
  if (!grid) return;

  grid.innerHTML = '';
  MONTH_NAMES.forEach((mName, idx) => {
    const monthNum = idx + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `month-grid-btn ${(pickerYear === currentYear && monthNum === currentMonth) ? 'active' : ''}`;
    btn.textContent = mName;
    btn.onclick = () => {
      setPeriod(pickerYear, monthNum);
      closePeriodModal();
    };
    grid.appendChild(btn);
  });
}

function jumpToCurrentRealMonth() {
  const now = new Date();
  setPeriod(now.getFullYear(), now.getMonth() + 1);
  closePeriodModal();
}

// Universal Set Period (Sets Year & Month dynamically)
async function setPeriod(year, month) {
  // 1. Save in-memory days of current period before switching
  const oldMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  employeesDB.forEach(employee => {
    if (!employee.timesheets) employee.timesheets = {};
    if (employee.days) {
      employee.timesheets[oldMonthKey] = JSON.parse(JSON.stringify(employee.days));
    }
  });

  currentYear = year;
  currentMonth = month;
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // 2. Load or generate days for all employees for the selected month
  for (const emp of employeesDB) {
    if (!emp.timesheets) emp.timesheets = {};
    if (!emp.timesheets[monthKey]) {
      if (window.supabaseService && window.supabaseService.isConfigured()) {
        const records = await window.supabaseService.loadRecords(emp.id, monthKey);
        if (records && records.length > 0) {
          emp.timesheets[monthKey] = records.map(r => ({
            day: r.day,
            dow: r.dow,
            e1: r.e1 || '',
            s1: r.s1 || '',
            e2: r.e2 || '',
            s2: r.s2 || '',
            status: r.status,
            statusLabel: r.status_label,
            just: r.just || '',
            signed: r.signed !== false
          }));
        } else {
          emp.timesheets[monthKey] = generateMonthData(currentYear, currentMonth, emp.id);
        }
      } else {
        emp.timesheets[monthKey] = generateMonthData(currentYear, currentMonth, emp.id);
      }
    }
    emp.days = emp.timesheets[monthKey];
  }

  updateMonthDisplay();
  renderTimesheetTable();
  recalculateAllTimes();
  renderEmployeesAdminTable();

  showToast(`📅 Período alterado para ${MONTH_NAMES[currentMonth - 1]} de ${currentYear}`);
}

// Change Month Action (Previous ◀ / Next ▶)
async function changeMonth(delta) {
  let newMonth = currentMonth + delta;
  let newYear = currentYear;
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }
  await setPeriod(newYear, newMonth);
}

// Convert "HH:MM" string to minutes
function timeToMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

// Convert minutes to "HH:MM" string
function minutesToTime(mins) {
  const isNeg = mins < 0;
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return isNeg ? `-${formatted}` : formatted;
}

// Calculate daily worked minutes, extra hours & balance based on company schedule
// Segunda a Sexta: Jornada de 8h (480 min) — Horário da empresa: 08:00 às 18:00
// Sábado: Jornada de 4h (240 min) — Horário da empresa: 08:00 às 12:00
// Domingo: D.S.R. (Fechado)
function calcDayMetrics(e1, s1, e2, s2, status, dow = '') {
  if (status === 'dsr' || status === 'feriado' || status === 'ferias' || status === 'atestado' || status === 'justificada') {
    return {
      workedMins: 0,
      balanceMins: 0,
      extraMins: 0,
      formattedWorked: '--:--',
      formattedBalance: '00:00',
      formattedExtra: '00:00',
      extraType: 'zero',
      type: 'zero'
    };
  }

  const standard = (dow === 'Sábado') 
    ? ((typeof systemSettings !== 'undefined' && systemSettings.workHoursSaturday !== undefined) ? systemSettings.workHoursSaturday : 240) 
    : ((typeof systemSettings !== 'undefined' && systemSettings.workHoursWeekday !== undefined) ? systemSettings.workHoursWeekday : 480);
  const tolerance = (typeof systemSettings !== 'undefined' && systemSettings.toleranceMinutes !== undefined) ? systemSettings.toleranceMinutes : 10;

  if (status === 'falta') {
    return {
      workedMins: 0,
      balanceMins: -standard,
      extraMins: -standard,
      formattedWorked: '00:00',
      formattedBalance: `-${minutesToTime(standard)}`,
      formattedExtra: `-${minutesToTime(standard)}`,
      extraType: 'negative',
      type: 'negative'
    };
  }

  if (status === 'meio_periodo') {
    const halfStandard = Math.round(standard / 2); // 240 min (4h)
    let total = 0;
    if (e2 && s2 && !e1 && !s1) {
      total = Math.max(0, timeToMinutes(s2) - timeToMinutes(e2));
    } else if (e1 && s1 && !e2 && !s2) {
      total = Math.max(0, timeToMinutes(s1) - timeToMinutes(e1));
    } else if (e1 && s1 && e2 && s2) {
      total = Math.max(0, timeToMinutes(s1) - timeToMinutes(e1)) + Math.max(0, timeToMinutes(s2) - timeToMinutes(e2));
    } else if (e1 && s2 && !s1 && !e2) {
      total = Math.max(0, timeToMinutes(s2) - timeToMinutes(e1));
    } else {
      total = halfStandard;
    }
    if (total === 0) total = halfStandard;
    const balance = total - standard; // 240 - 480 = -240 (-4h)
    const formattedWorked = minutesToTime(total);
    const formattedExtra = balance < 0 ? `-${minutesToTime(Math.abs(balance))}` : (balance > 0 ? `+${minutesToTime(balance)}` : '00:00');
    return {
      workedMins: total,
      balanceMins: balance,
      extraMins: balance > 0 ? balance : 0,
      atrasoMins: balance < 0 ? Math.abs(balance) : 0,
      formattedWorked,
      formattedBalance: formattedExtra,
      formattedExtra,
      extraType: 'negative',
      type: 'negative'
    };
  }

  // Se nenhum horário foi preenchido ainda
  if (!e1 && !s1 && !e2 && !s2) {
    return {
      workedMins: 0,
      balanceMins: 0,
      extraMins: 0,
      formattedWorked: '--:--',
      formattedBalance: '00:00',
      formattedExtra: '00:00',
      extraType: 'zero',
      type: 'zero'
    };
  }

  // Se preencheu apenas entrada sem nenhuma saída (dia ainda em andamento)
  if (e1 && !s1 && !s2) {
    return {
      workedMins: 0,
      balanceMins: 0,
      extraMins: 0,
      formattedWorked: '--:--',
      formattedBalance: '00:00',
      formattedExtra: '00:00',
      extraType: 'zero',
      type: 'zero'
    };
  }

  // Cálculo de horas trabalhadas no dia
  let total = 0;
  if (e1 && s1 && e2 && s2) {
    total = Math.max(0, timeToMinutes(s1) - timeToMinutes(e1)) + Math.max(0, timeToMinutes(s2) - timeToMinutes(e2));
  } else if (e1 && s1 && !e2 && !s2) {
    total = Math.max(0, timeToMinutes(s1) - timeToMinutes(e1));
  } else if (e1 && s2 && !s1 && !e2) {
    total = Math.max(0, timeToMinutes(s2) - timeToMinutes(e1));
  } else {
    const p1 = (e1 && s1) ? Math.max(0, timeToMinutes(s1) - timeToMinutes(e1)) : 0;
    const p2 = (e2 && s2) ? Math.max(0, timeToMinutes(s2) - timeToMinutes(e2)) : 0;
    total = p1 + p2;
  }

  const diff = total - standard;

  let type = 'zero';
  let formattedBalance = '00:00';
  let formattedExtra = '00:00';
  let extraType = 'zero';

  // Sempre conta para os dois lados: tanto para horas extras (+) quanto para horas a menos (-)
  if (diff > 0) {
    // Horas Extras (positivo) - conta a partir do primeiro minuto
    formattedBalance = `+${minutesToTime(diff)}`;
    formattedExtra = `+${minutesToTime(diff)}`;
    type = 'positive';
    extraType = 'positive';
  } else if (diff < 0) {
    // Atraso / Débito de horas (negativo) - conta a partir do primeiro minuto
    formattedBalance = `-${minutesToTime(Math.abs(diff))}`;
    formattedExtra = `-${minutesToTime(Math.abs(diff))}`;
    type = 'negative';
    extraType = 'negative';
  } else {
    // Exatamente na meta da jornada
    formattedBalance = '00:00';
    formattedExtra = '00:00';
    type = 'zero';
    extraType = 'zero';
  }

  return {
    workedMins: total,
    balanceMins: diff,
    extraMins: diff > 0 ? diff : 0,
    atrasoMins: diff < 0 ? Math.abs(diff) : 0,
    formattedWorked: minutesToTime(total),
    formattedBalance,
    formattedExtra,
    extraType,
    type
  };
}

function getStatusLabel(status) {
  const map = {
    'presenca': 'Presença',
    'meio_periodo': 'Meio Período',
    'falta': 'Faltou',
    'atestado': 'Atestado',
    'justificada': 'Justificou',
    'ferias': 'Férias',
    'dsr': 'D.S.R.',
    'feriado': 'Feriado'
  };
  return map[status] || 'Presença';
}

// Render Main Timesheet Table for Current Employee
function renderTimesheetTable() {
  const tbody = document.getElementById('timesheet-tbody');
  if (!tbody) return;

  const emp = getCurrentEmployee();
  if (!emp || !emp.days || emp.days.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 45px 20px; color: #94A3B8;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
          <strong style="display: block; font-size: 1rem; color: #475569; margin-bottom: 4px;">Nenhum colaborador selecionado</strong>
          <span style="font-size: 0.85rem; color: #64748B;">Cadastre um colaborador para visualizar e preencher a folha de ponto.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  emp.days.forEach((item, index) => {
    const tr = document.createElement('tr');
    
    // Row classes
    if (item.status === 'dsr') tr.className = 'weekend-row';
    else if (item.status === 'feriado') tr.className = 'holiday-row';
    else if (item.status === 'falta') tr.className = 'absence-row';
    else if (item.status === 'atestado') tr.className = 'atestado-row';
    else if (item.status === 'justificada') tr.className = 'justificada-row';
    else if (item.status === 'ferias') tr.className = 'ferias-row';

    const dayPad = String(item.day).padStart(2, '0');
    const monthPad = String(currentMonth).padStart(2, '0');
    const isNonWorking = item.status === 'dsr' || item.status === 'feriado' || item.status === 'atestado' || item.status === 'falta' || item.status === 'ferias' || item.status === 'justificada';
    const metrics = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDate = now.getDate();

    const isToday = (todayYear === currentYear && todayMonth === currentMonth && todayDate === item.day);
    const isFuture = (currentYear > todayYear) || 
                     (currentYear === todayYear && currentMonth > todayMonth) || 
                     (currentYear === todayYear && currentMonth === todayMonth && item.day > todayDate);

    if (isToday) tr.classList.add('today-row');
    if (isFuture) tr.classList.add('future-row');

    tr.innerHTML = `
      <td>
        <div class="day-cell">
          <strong>${dayPad}/${monthPad}/${currentYear} ${isToday ? '<span class="today-tag">Hoje</span>' : ''}</strong>
          <span>${item.dow}</span>
        </div>
      </td>
      <td style="text-align: center;">
        <input type="text" class="time-input" data-index="${index}" data-field="e1" value="${item.e1 || ''}" placeholder="--:--" maxlength="5" inputmode="numeric" autocomplete="off" ${(isFuture || (isNonWorking && !item.e1)) ? 'disabled' : ''}>
      </td>
      <td style="text-align: center;">
        <div class="interval-input-group">
          <input type="text" class="time-input" data-index="${index}" data-field="s1" value="${item.s1 || ''}" placeholder="--:--" maxlength="5" inputmode="numeric" autocomplete="off" title="Saída Intervalo" ${(isFuture || (isNonWorking && !item.s1)) ? 'disabled' : ''}>
          <span class="interval-separator">às</span>
          <input type="text" class="time-input" data-index="${index}" data-field="e2" value="${item.e2 || ''}" placeholder="--:--" maxlength="5" inputmode="numeric" autocomplete="off" title="Retorno Intervalo" ${(isFuture || (isNonWorking && !item.e2)) ? 'disabled' : ''}>
        </div>
      </td>
      <td style="text-align: center;">
        <input type="text" class="time-input" data-index="${index}" data-field="s2" value="${item.s2 || ''}" placeholder="--:--" maxlength="5" inputmode="numeric" autocomplete="off" title="Saída Final" ${(isFuture || (isNonWorking && !item.s2)) ? 'disabled' : ''}>
      </td>
      <td style="text-align: center;">
        <span class="extra-badge ${metrics.extraType}" id="extra-${index}">${metrics.formattedExtra}</span>
      </td>
      <td style="text-align: center;">
        <div class="status-cell-wrapper">
          <select class="status-select ${item.status || 'presenca'}" data-index="${index}" onchange="changeDayStatus(${index}, this.value)" title="${isFuture ? 'Disponível apenas quando chegar a data' : 'Situação do Dia'}" ${isFuture ? 'disabled' : ''}>
            <option value="presenca" ${(item.status === 'presenca' || !item.status) ? 'selected' : ''}>🟢 Presença</option>
            <option value="meio_periodo" ${item.status === 'meio_periodo' ? 'selected' : ''}>🟡 Meio Período (-4h)</option>
            <option value="falta" ${item.status === 'falta' ? 'selected' : ''}>🔴 Faltou</option>
            <option value="atestado" ${item.status === 'atestado' ? 'selected' : ''}>🟠 Atestado</option>
            <option value="justificada" ${item.status === 'justificada' ? 'selected' : ''}>🟡 Justificou</option>
            <option value="ferias" ${item.status === 'ferias' ? 'selected' : ''}>🌴 Férias</option>
            <option value="dsr" ${item.status === 'dsr' ? 'selected' : ''}>🟣 DSR / Folga</option>
            <option value="feriado" ${item.status === 'feriado' ? 'selected' : ''}>🔵 Feriado</option>
          </select>
          ${ (item.status === 'atestado' || item.status === 'justificada' || item.just || item.attachmentData) ? `
            <button type="button" class="btn-just-chip ${item.attachmentData ? 'has-attachment' : (item.just ? 'has-text' : '')}" onclick="openJustificationModal(${index})" title="${item.just || 'Adicionar ou visualizar observação e comprovante'}">
              ${ item.attachmentData 
                 ? (item.attachmentType && item.attachmentType.includes('pdf') ? '📄 PDF Anexado' : '📷 Foto Anexada')
                 : (item.just ? '📝 ' + (item.just.length > 14 ? item.just.slice(0, 14) + '…' : item.just) : '➕ Obs / Anexo') }
            </button>
          ` : '' }
        </div>
      </td>
      <td style="text-align: center;">
        <div class="signature-check-cell">
          <input type="checkbox" class="sig-checkbox" id="sig-${index}" data-index="${index}" ${(item.signed || Boolean(emp.signatures && emp.signatures[monthKey]) || Boolean(emp.digitalSignature)) ? 'checked' : ''} onchange="toggleSignature(${index}, this.checked)" title="${isFuture ? 'Disponível na data' : 'Marcar Assinatura'}" ${isFuture ? 'disabled' : ''}>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach input listeners: automatic time masking (:), validation, and instant metric calculation
  document.querySelectorAll('.time-input').forEach(input => {
    // Keydown for backspace when deleting after colon
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value.endsWith(':')) {
        e.preventDefault();
        input.value = input.value.slice(0, -2);
        input.dispatchEvent(new Event('input'));
      }
    });

    // Real-time mask & calculation
    input.addEventListener('input', (e) => {
      formatTimeMaskInput(input, false);

      const idx = parseInt(input.dataset.index, 10);
      const row = input.closest('tr');
      if (!row) return;

      const e1 = row.querySelector('[data-field="e1"]')?.value || '';
      const s1 = row.querySelector('[data-field="s1"]')?.value || '';
      const e2 = row.querySelector('[data-field="e2"]')?.value || '';
      const s2 = row.querySelector('[data-field="s2"]')?.value || '';
      const emp = getCurrentEmployee();
      if (emp && emp.days && emp.days[idx]) {
        emp.days[idx].e1 = e1;
        emp.days[idx].s1 = s1;
        emp.days[idx].e2 = e2;
        emp.days[idx].s2 = s2;
        const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        if (!emp.timesheets) emp.timesheets = {};
        emp.timesheets[monthKey] = JSON.parse(JSON.stringify(emp.days));
      }
      const status = emp?.days?.[idx]?.status || 'presenca';
      const dow = emp?.days?.[idx]?.dow || '';

      const metrics = calcDayMetrics(e1, s1, e2, s2, status, dow);
      const extraEl = document.getElementById(`extra-${idx}`);

      if (extraEl) {
        extraEl.className = `extra-badge ${metrics.extraType}`;
        extraEl.innerText = metrics.formattedExtra;
      }
      recalculateAllTimes();
    });

    // On blur: format complete time (e.g. "8" -> "08:00", "0815" -> "08:15") & auto-persist
    input.addEventListener('blur', () => {
      formatTimeMaskInput(input, true);

      const idx = parseInt(input.dataset.index, 10);
      const row = input.closest('tr');
      if (!row) return;

      const e1 = row.querySelector('[data-field="e1"]')?.value || '';
      const s1 = row.querySelector('[data-field="s1"]')?.value || '';
      const e2 = row.querySelector('[data-field="e2"]')?.value || '';
      const s2 = row.querySelector('[data-field="s2"]')?.value || '';
      const emp = getCurrentEmployee();
      if (emp && emp.days && emp.days[idx]) {
        emp.days[idx].e1 = e1;
        emp.days[idx].s1 = s1;
        emp.days[idx].e2 = e2;
        emp.days[idx].s2 = s2;
        const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        if (!emp.timesheets) emp.timesheets = {};
        emp.timesheets[monthKey] = JSON.parse(JSON.stringify(emp.days));
        saveEmployeesToLocalStorage();
      }
      const status = emp?.days?.[idx]?.status || 'presenca';
      const dow = emp?.days?.[idx]?.dow || '';
      const metrics = calcDayMetrics(e1, s1, e2, s2, status, dow);
      const extraEl = document.getElementById(`extra-${idx}`);
      if (extraEl) {
        extraEl.className = `extra-badge ${metrics.extraType}`;
        extraEl.innerText = metrics.formattedExtra;
      }
      recalculateAllTimes();
    });
  });
}

// Máscara inteligente para horários com inserção automática dos dois pontos (:)
function formatTimeMaskInput(input, isBlur = false) {
  let raw = input.value.replace(/\D/g, ''); // apenas números

  if (!raw) {
    if (isBlur) input.value = '';
    return;
  }

  if (isBlur) {
    if (raw.length === 1) {
      input.value = `0${raw}:00`;
    } else if (raw.length === 2) {
      let h = Math.min(23, parseInt(raw, 10));
      input.value = `${String(h).padStart(2, '0')}:00`;
    } else if (raw.length === 3) {
      let h = Math.min(23, parseInt(raw.slice(0, 2), 10));
      let m = Math.min(59, parseInt(raw.slice(2) + '0', 10));
      input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      let h = Math.min(23, parseInt(raw.slice(0, 2), 10));
      let m = Math.min(59, parseInt(raw.slice(2, 4), 10));
      input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return;
  }

  // Digitação em tempo real
  if (raw.length > 4) raw = raw.slice(0, 4);

  if (raw.length === 1 && parseInt(raw, 10) >= 3) {
    // Se o primeiro dígito for 3, 4, 5, 6, 7, 8, 9 (ex: 8 -> 08:)
    input.value = `0${raw}:`;
  } else if (raw.length === 2) {
    let hh = raw;
    if (parseInt(hh, 10) > 23) hh = '23';
    input.value = `${hh}:`;
  } else if (raw.length >= 3) {
    let hh = raw.slice(0, 2);
    let mm = raw.slice(2, 4);
    if (parseInt(hh, 10) > 23) hh = '23';
    if (mm.length === 2 && parseInt(mm, 10) > 59) mm = '59';
    input.value = `${hh}:${mm}`;
  } else {
    input.value = raw;
  }
}

// ==========================================================================
// Gestão de Férias & Retorno de Férias (Topo & Ações Globais — Padrão 30 Dias CLT)
// ==========================================================================
let currentFeriasMode = 'start'; // 'start' ou 'return'

const DOW_FULL_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function calculateVacationRange(startDay, startMonth, startYear, durationOption = '30') {
  const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  let durationDays = 30;

  if (durationOption === 'end_of_month') {
    const daysInStartMonth = new Date(startYear, startMonth, 0).getDate();
    durationDays = (daysInStartMonth - startDay + 1);
  } else {
    durationDays = parseInt(durationOption, 10) || 30;
  }

  // Último dia de férias (inclusivo)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + durationDays - 1);

  // Primeiro dia de retorno ao trabalho
  const returnDate = new Date(startDate);
  returnDate.setDate(startDate.getDate() + durationDays);

  return {
    startDate,
    endDate,
    returnDate,
    durationDays
  };
}

function openTopFeriasModal(startDayIdx = null, mode = 'start') {
  currentFeriasMode = mode;
  const emp = getCurrentEmployee();
  if (!emp || !emp.days) return;

  const subtitle = document.getElementById('ferias-modal-subtitle');
  if (subtitle) {
    subtitle.textContent = `Colaborador: ${emp.name} — Período: ${MONTH_NAMES[currentMonth - 1]}/${currentYear}`;
  }

  // Populate Day Selects
  const startSelect = document.getElementById('ferias-start-day-select');
  const returnSelect = document.getElementById('ferias-return-day-select');
  const durationSelect = document.getElementById('ferias-duration-select');

  if (durationSelect && !durationSelect.value) {
    durationSelect.value = '30';
  }

  if (startSelect) {
    startSelect.innerHTML = '';
    emp.days.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `Dia ${String(d.day).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')} (${d.dow})`;
      startSelect.appendChild(opt);
    });

    const todayIndex = emp.days.findIndex(d => {
      const now = new Date();
      return now.getFullYear() === currentYear && (now.getMonth() + 1) === currentMonth && now.getDate() === d.day;
    });

    startSelect.value = startDayIdx !== null ? startDayIdx : (todayIndex !== -1 ? todayIndex : 0);
  }

  if (returnSelect) {
    returnSelect.innerHTML = '';
    emp.days.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `Dia ${String(d.day).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')} (${d.dow})`;
      returnSelect.appendChild(opt);
    });

    const firstVacationIdx = emp.days.findIndex(d => d.status === 'ferias');
    returnSelect.value = firstVacationIdx !== -1 ? Math.min(firstVacationIdx + 1, emp.days.length - 1) : (startDayIdx !== null ? startDayIdx : 0);
  }

  setFeriasModalMode(mode);
  updateFeriasStartPreview();
  updateFeriasReturnPreview();

  const modal = document.getElementById('modal-ferias-manager');
  if (modal) modal.style.display = 'flex';
}

function closeFeriasManagerModal() {
  const modal = document.getElementById('modal-ferias-manager');
  if (modal) modal.style.display = 'none';
}

function setFeriasModalMode(mode) {
  currentFeriasMode = mode;
  const tabStart = document.getElementById('tab-mode-ferias-start');
  const tabReturn = document.getElementById('tab-mode-ferias-return');
  const secStart = document.getElementById('section-ferias-start');
  const secReturn = document.getElementById('section-ferias-return');
  const btnText = document.getElementById('btn-confirm-ferias-text');
  const btn = document.getElementById('btn-confirm-ferias-action');
  const durationSelect = document.getElementById('ferias-duration-select');
  const durationDays = durationSelect ? (parseInt(durationSelect.value, 10) || 30) : 30;

  if (mode === 'start') {
    if (tabStart) {
      tabStart.classList.add('active');
      tabStart.style.background = '#FFFFFF';
      tabStart.style.color = '#065F46';
      tabStart.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }
    if (tabReturn) {
      tabReturn.classList.remove('active');
      tabReturn.style.background = 'transparent';
      tabReturn.style.color = '#64748B';
      tabReturn.style.boxShadow = 'none';
    }
    if (secStart) secStart.style.display = 'flex';
    if (secReturn) secReturn.style.display = 'none';
    if (btnText) btnText.textContent = `Confirmar Férias (${durationDays} dias)`;
    if (btn) {
      btn.style.background = '#065F46';
      btn.style.borderColor = '#065F46';
    }
  } else {
    if (tabReturn) {
      tabReturn.classList.add('active');
      tabReturn.style.background = '#FFFFFF';
      tabReturn.style.color = '#1D4ED8';
      tabReturn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }
    if (tabStart) {
      tabStart.classList.remove('active');
      tabStart.style.background = 'transparent';
      tabStart.style.color = '#64748B';
      tabStart.style.boxShadow = 'none';
    }
    if (secStart) secStart.style.display = 'none';
    if (secReturn) secReturn.style.display = 'flex';
    if (btnText) btnText.textContent = 'Confirmar Retorno ao Trabalho';
    if (btn) {
      btn.style.background = '#1D4ED8';
      btn.style.borderColor = '#1D4ED8';
    }
  }
}

function updateFeriasStartPreview() {
  const startSelect = document.getElementById('ferias-start-day-select');
  const durationSelect = document.getElementById('ferias-duration-select');
  const previewBox = document.getElementById('ferias-start-preview-box');
  const btnText = document.getElementById('btn-confirm-ferias-text');
  if (!startSelect || !previewBox) return;

  const idx = parseInt(startSelect.value, 10);
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[idx]) return;

  const startDay = emp.days[idx].day;
  const durationOption = durationSelect ? durationSelect.value : '30';
  const range = calculateVacationRange(startDay, currentMonth, currentYear, durationOption);

  const formatPt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const dowPt = (d) => DOW_FULL_NAMES[d.getDay()];

  if (btnText && currentFeriasMode === 'start') {
    btnText.textContent = `Confirmar Férias (${range.durationDays} dias)`;
  }

  // Detalhamento por mês
  let breakdownHtml = '';
  const startM = range.startDate.getMonth();
  const endM = range.endDate.getMonth();
  const startY = range.startDate.getFullYear();
  const endY = range.endDate.getFullYear();

  if (startM === endM && startY === endY) {
    breakdownHtml = `
      <div style="font-size: 0.8rem; color: #334155; margin-top: 4px;">
        • <strong>${MONTH_NAMES[startM]}/${startY}:</strong> do dia <strong>${String(range.startDate.getDate()).padStart(2, '0')}</strong> ao dia <strong>${String(range.endDate.getDate()).padStart(2, '0')}</strong> (${range.durationDays} dia(s)).
      </div>
    `;
  } else {
    const daysInFirstMonth = new Date(startY, startM + 1, 0).getDate() - range.startDate.getDate() + 1;
    const daysInSecondMonth = range.endDate.getDate();
    breakdownHtml = `
      <div style="font-size: 0.8rem; color: #334155; margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
        <div>• <strong>${MONTH_NAMES[startM]}/${startY}:</strong> do dia <strong>${String(range.startDate.getDate()).padStart(2, '0')}</strong> até <strong>${new Date(startY, startM + 1, 0).getDate()}</strong> (${daysInFirstMonth} dia(s))</div>
        <div>• <strong>${MONTH_NAMES[endM]}/${endY}:</strong> do dia <strong>01</strong> até <strong>${String(range.endDate.getDate()).padStart(2, '0')}</strong> (${daysInSecondMonth} dia(s))</div>
      </div>
    `;
  }

  previewBox.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 700; font-size: 0.9rem; color: #065F46;">🌴 Período de Férias (${range.durationDays} Dias Consecutivos)</span>
      </div>
      <div style="background: #FFFFFF; border: 1px solid #D1FAE5; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; font-size: 0.84rem;">
        <div>📅 <strong>Início:</strong> ${formatPt(range.startDate)} (${dowPt(range.startDate)})</div>
        <div>🏁 <strong>Último dia de férias:</strong> ${formatPt(range.endDate)} (${dowPt(range.endDate)})</div>
        <div style="color: #1D4ED8; font-weight: 700; margin-top: 2px;">🔙 <strong>Retorno ao trabalho:</strong> ${formatPt(range.returnDate)} (${dowPt(range.returnDate)})</div>
      </div>
      ${breakdownHtml}
      <div style="font-size: 0.78rem; color: #047857;">
        ✨ As batidas de ponto serão regularizadas como Férias sem faltas ou descontos.
      </div>
    </div>
  `;
}

function updateFeriasReturnPreview() {
  const returnSelect = document.getElementById('ferias-return-day-select');
  const previewBox = document.getElementById('ferias-return-preview-box');
  if (!returnSelect || !previewBox) return;

  const idx = parseInt(returnSelect.value, 10);
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[idx]) return;

  const returnDay = emp.days[idx].day;
  const endDay = emp.days[emp.days.length - 1].day;
  const count = emp.days.length - idx;
  const mName = MONTH_NAMES[currentMonth - 1];

  previewBox.innerHTML = `
    <strong>🔙 Resumo do retorno ao trabalho:</strong><br>
    A partir do dia <strong>${String(returnDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}</strong> até <strong>${String(endDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}</strong> (${count} dia(s)), o colaborador retoma a jornada.<br>
    <small style="color: #1D4ED8;">Os dias voltam para a situação padrão de Presença.</small>
  `;
}

function executeFeriasModalAction() {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days) return;

  if (currentFeriasMode === 'start') {
    const startSelect = document.getElementById('ferias-start-day-select');
    const durationSelect = document.getElementById('ferias-duration-select');
    const startIdx = parseInt(startSelect.value, 10);
    const startDay = emp.days[startIdx].day;
    const durationOption = durationSelect ? durationSelect.value : '30';

    const range = calculateVacationRange(startDay, currentMonth, currentYear, durationOption);

    // Salvar metadados de férias no colaborador
    emp.statusCategory = 'ferias';
    emp.statusTag = 'Em Férias';
    emp.statusTagClass = 'blue';
    emp.statusPillLabel = '🌴 Em Férias';
    emp.statusPillClass = 'ferias';
    emp.vacationStart = range.startDate.toISOString().split('T')[0];
    emp.vacationEnd = range.endDate.toISOString().split('T')[0];
    emp.vacationReturn = range.returnDate.toISOString().split('T')[0];
    emp.vacationDays = range.durationDays;

    if (!emp.timesheets) emp.timesheets = {};

    // 1. Aplicar nos dias do mês atualmente carregado (emp.days)
    emp.days.forEach(item => {
      const itemDate = new Date(currentYear, currentMonth - 1, item.day, 0, 0, 0, 0);
      if (itemDate >= range.startDate && itemDate <= range.endDate) {
        item.status = 'ferias';
        item.statusLabel = 'Férias Regulamentares';
        item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
        item.signed = true;
        item.just = `Férias Regulamentares (${range.durationDays} dias)`;
      }
    });

    // 2. Salvar timesheet do mês atual
    const curMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    emp.timesheets[curMonthKey] = JSON.parse(JSON.stringify(emp.days));

    // 3. Aplicar em todos os meses abrangidos pelas férias
    let curCheckDate = new Date(range.startDate);
    while (curCheckDate <= range.endDate) {
      const checkYear = curCheckDate.getFullYear();
      const checkMonth = curCheckDate.getMonth() + 1;
      const monthKey = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;

      if (monthKey !== curMonthKey) {
        if (!emp.timesheets[monthKey]) {
          emp.timesheets[monthKey] = generateMonthData(checkYear, checkMonth, emp.id);
        }
        emp.timesheets[monthKey].forEach(item => {
          const itemDate = new Date(checkYear, checkMonth - 1, item.day, 0, 0, 0, 0);
          if (itemDate >= range.startDate && itemDate <= range.endDate) {
            item.status = 'ferias';
            item.statusLabel = 'Férias Regulamentares';
            item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
            item.signed = true;
            item.just = `Férias Regulamentares (${range.durationDays} dias)`;
          }
        });
      }

      // Avançar para o primeiro dia do próximo mês
      curCheckDate = new Date(checkYear, checkMonth, 1);
    }

    const formatPt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    showToast(`🌴 Férias de ${range.durationDays} dias aplicadas de ${formatPt(range.startDate)} a ${formatPt(range.endDate)} para ${emp.name}!`);
  } else {
    // Return from vacation (Retorno ao trabalho)
    const returnSelect = document.getElementById('ferias-return-day-select');
    const returnIdx = parseInt(returnSelect.value, 10);

    for (let i = returnIdx; i < emp.days.length; i++) {
      const item = emp.days[i];
      item.status = 'presenca';
      item.e1 = '';
      item.s1 = '';
      item.e2 = '';
      item.s2 = '';
      item.just = '';
      item.signed = false;
    }

    emp.statusCategory = 'ativo';
    emp.statusTag = 'Ativo';
    emp.statusTagClass = 'green';
    emp.statusPillLabel = '🟢 Ativo';
    emp.statusPillClass = 'regular';
    emp.vacationStart = null;
    emp.vacationEnd = null;

    const returnDay = emp.days[returnIdx].day;
    showToast(`🔙 Retorno de férias registrado a partir do dia ${String(returnDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')} para ${emp.name}!`);
  }

  // Persistência
  saveEmployeesToLocalStorage();
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    window.supabaseService.atualizarFuncionario(emp.id, emp).catch(err => console.warn(err));
  }

  closeFeriasManagerModal();
  renderTimesheetTable();
  recalculateAllTimes();
  renderEmployeesAdminTable();
  updateSidebarBadges(false, emp.statusCategory === 'ferias');
}

// Change day situation/status (Linha a Linha)
function changeDayStatus(index, newStatus) {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[index]) return;

  const item = emp.days[index];
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDate = now.getDate();
  const isFuture = (currentYear > todayYear) || 
                   (currentYear === todayYear && currentMonth > todayMonth) || 
                   (currentYear === todayYear && currentMonth === todayMonth && item.day > todayDate);

  if (isFuture) return;

  const prevStatus = item.status || 'presenca';

  if (newStatus === 'ferias') {
    openTopFeriasModal(index, 'start');
    return;
  }

  item.status = newStatus;

  if (newStatus === 'falta') {
    item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
    item.signed = false;
  } else if (newStatus === 'atestado' || newStatus === 'justificada') {
    item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
    item.signed = true;
    renderTimesheetTable();
    recalculateAllTimes();
    renderEmployeesAdminTable();
    openJustificationModal(index, newStatus);
    return;
  } else if (newStatus === 'dsr' || newStatus === 'feriado') {
    item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
    item.signed = true;
  } else if (newStatus === 'meio_periodo') {
    item.e1 = '';
    item.s1 = '';
    item.e2 = '14:00';
    item.s2 = '18:00';
    item.signed = true;
  } else if (newStatus === 'presenca') {
    if (!item.e1) item.e1 = '08:00';
    if (!item.s1) item.s1 = '12:00';
    if (!item.e2) item.e2 = '13:00';
    if (!item.s2) item.s2 = '17:00';
    item.signed = true;
  }

  // Auto persistência ao mudar situação
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (!emp.timesheets) emp.timesheets = {};
  emp.timesheets[monthKey] = JSON.parse(JSON.stringify(emp.days));
  saveEmployeesToLocalStorage();

  renderTimesheetTable();
  recalculateAllTimes();
  renderEmployeesAdminTable();
}

// Toggle individual signature checkbox
function toggleSignature(index, isChecked) {
  const emp = getCurrentEmployee();
  if (emp && emp.days && emp.days[index]) {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDate = now.getDate();
    const isFuture = (currentYear > todayYear) || 
                     (currentYear === todayYear && currentMonth > todayMonth) || 
                     (currentYear === todayYear && currentMonth === todayMonth && emp.days[index].day > todayDate);
    if (!isFuture) {
      emp.days[index].signed = isChecked;
    }
  }
}

// Toggle all signatures checkbox
function toggleAllSignatures(isChecked) {
  const emp = getCurrentEmployee();
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDate = now.getDate();

  if (emp && emp.days) {
    emp.days.forEach(day => {
      const isFuture = (currentYear > todayYear) || 
                       (currentYear === todayYear && currentMonth > todayMonth) || 
                       (currentYear === todayYear && currentMonth === todayMonth && day.day > todayDate);
      if (!isFuture) {
        day.signed = isChecked;
      }
    });
  }
  document.querySelectorAll('.sig-checkbox:not(:disabled)').forEach(cb => {
    cb.checked = isChecked;
  });
}

// Update single row on input
function updateSingleRowMetrics(idx) {
  const emp = getCurrentEmployee();
  const item = emp.days[idx];
  const metrics = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
  
  const extraEl = document.getElementById(`extra-${idx}`);
  if (extraEl) {
    extraEl.className = `extra-badge ${metrics.extraType}`;
    extraEl.innerText = metrics.formattedExtra;
  }
}

// Recalculate summary cards
function recalculateAllTimes() {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days) return;

  let totalPresencas = 0;
  let totalExtraMins = 0;
  let totalAtrasoMins = 0;
  let totalWorkedMins = 0;
  let totalFaltas = 0;

  emp.days.forEach(item => {
    if (item.status === 'presenca' && (item.e1 || item.s1 || item.e2 || item.s2)) {
      totalPresencas++;
      const m = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
      totalWorkedMins += m.workedMins;
      if (m.balanceMins > 0) totalExtraMins += m.balanceMins;
      if (m.balanceMins < 0) totalAtrasoMins += Math.abs(m.balanceMins);
    } else if (item.status === 'falta') {
      totalFaltas++;
    }
  });

  const netBalanceMins = totalExtraMins - totalAtrasoMins;

  const pEl = document.getElementById('stat-presencas');
  const exEl = document.getElementById('stat-extras');
  const atEl = document.getElementById('stat-atrasos');
  const bEl = document.getElementById('stat-banco');
  const fEl = document.getElementById('stat-faltas');

  if (pEl) pEl.innerHTML = `${totalPresencas} <small>dias</small>`;
  if (exEl) exEl.innerHTML = `+${minutesToTime(totalExtraMins)} <small>h</small>`;
  if (atEl) atEl.innerHTML = `-${minutesToTime(totalAtrasoMins)} <small>h</small>`;
  if (bEl) bEl.innerHTML = `${netBalanceMins >= 0 ? '+' : ''}${minutesToTime(netBalanceMins)} <small>h</small>`;
  if (fEl) fEl.innerHTML = `${String(totalFaltas).padStart(2, '0')} <small>dia</small>`;
}

// Save Data Action - Commits all changes and guarantees permanence across F5 / page reloads
async function saveTimesheetData() {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days) return;

  const btn = document.getElementById('btn-save-timesheet');
  const originalBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"></circle></svg> Salvando alterações...`;
  }

  // 1. Read all typed inputs and selects from the DOM table
  const rows = document.querySelectorAll('#timesheet-tbody tr');
  rows.forEach((row, idx) => {
    if (emp.days[idx]) {
      const e1Input = row.querySelector('[data-field="e1"]');
      const s1Input = row.querySelector('[data-field="s1"]');
      const e2Input = row.querySelector('[data-field="e2"]');
      const s2Input = row.querySelector('[data-field="s2"]');
      const statusSelect = row.querySelector('.status-select');
      const justInput = row.querySelector('.justification-input');
      const sigCb = row.querySelector('.sig-checkbox');

      if (e1Input) emp.days[idx].e1 = e1Input.value.trim();
      if (s1Input) emp.days[idx].s1 = s1Input.value.trim();
      if (e2Input) emp.days[idx].e2 = e2Input.value.trim();
      if (s2Input) emp.days[idx].s2 = s2Input.value.trim();
      if (statusSelect) emp.days[idx].status = statusSelect.value;
      if (justInput) emp.days[idx].just = justInput.value.trim();
      if (sigCb) emp.days[idx].signed = sigCb.checked;
    }
  });

  // 2. Garante persistência nos timesheets do mês atual
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (!emp.timesheets) emp.timesheets = {};
  emp.timesheets[monthKey] = JSON.parse(JSON.stringify(emp.days));

  // 3. Commit e recálculo
  recalculateAllTimes();
  renderEmployeesAdminTable();

  // 4. Salvar no localStorage de imediato (Permanência garantida no F5)
  saveEmployeesToLocalStorage();

  // 5. Save to Supabase if connected
  if (window.supabaseService && window.supabaseService.isConfigured() && typeof window.supabaseService.saveFullTimesheet === 'function') {
    try {
      await window.supabaseService.saveFullTimesheet(emp.id, monthKey, emp.days);
    } catch (err) {
      console.warn('Erro ao salvar no Supabase:', err);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Salvo com Sucesso!`;
    setTimeout(() => {
      if (btn) btn.innerHTML = originalBtnHtml || `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvar alterações`;
    }, 2500);
  }

  showToast(`💾 Folha de ponto de ${emp.name} salva com sucesso! Os dados persistem após o F5.`);
}

// Render Employees Admin Table
function renderEmployeesAdminTable() {
  const tbody = document.getElementById('employees-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!employeesDB || employeesDB.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 45px 20px; color: #94A3B8;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">👥</div>
          <strong style="display: block; font-size: 1.05rem; color: #334155; margin-bottom: 6px;">Nenhum funcionário cadastrado</strong>
          <span style="font-size: 0.88rem; color: #64748B;">Cadastre um colaborador pelo botão <strong>"+ Cadastrar Funcionário"</strong> acima ou insira no seu Supabase.</span>
        </td>
      </tr>
    `;
    filterEmployees();
    return;
  }

  employeesDB.forEach(emp => {
    let totalExtraMins = 0;
    let totalAtrasoMins = 0;
    let totalFaltas = 0;

    const daysList = emp.days || [];
    daysList.forEach(item => {
      if (item.status === 'presenca' && (item.e1 || item.s1 || item.e2 || item.s2)) {
        const m = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
        if (m.balanceMins > 0) totalExtraMins += m.balanceMins;
        if (m.balanceMins < 0) totalAtrasoMins += Math.abs(m.balanceMins);
      } else if (item.status === 'falta') {
        totalFaltas++;
      }
    });

    const netBalanceMins = totalExtraMins - totalAtrasoMins;
    const balanceDisplay = totalFaltas > 0 
      ? `-08:00h` 
      : (netBalanceMins > 0 ? `+${minutesToTime(netBalanceMins)}h` : (netBalanceMins < 0 ? `-${minutesToTime(Math.abs(netBalanceMins))}h` : `+00:00h`));
    const balanceColorClass = totalFaltas > 0 ? 'text-danger' : (netBalanceMins > 0 ? 'text-success' : 'text-muted');

    const tr = document.createElement('tr');
    tr.dataset.id = emp.id;
    tr.dataset.name = emp.name;
    tr.dataset.role = emp.role;
    tr.dataset.cpf = emp.cpf;
    tr.dataset.dept = emp.dept || '';
    tr.dataset.status = emp.statusCategory || 'ativo';

    const pillInfo = getStatusPillInfo(emp.statusCategory || 'ativo');

    tr.onclick = (e) => {
      if (!e.target.closest('.btn-icon') && !e.target.closest('.btn-table-action')) {
        viewEmployeeTimesheet(emp.id);
      }
    };

    tr.innerHTML = `
      <td style="text-align: left;">
        <div class="emp-row-profile">
          <div class="emp-mini-avatar ${emp.color || 'green'}">${emp.initials || 'FN'}</div>
          <div>
            <strong>${emp.name}</strong>
            <span>CPF: ${emp.cpf} ${emp.whatsapp ? `• 📱 ${emp.whatsapp}` : ''}</span>
          </div>
        </div>
      </td>
      <td style="text-align: center;">
        <strong>${emp.fullDept || emp.dept}</strong>
        <span class="sub-cargo">${emp.role}</span>
      </td>
      <td style="text-align: center;"><span class="status-pill ${pillInfo.pillClass}">${pillInfo.label}</span></td>
      <td style="text-align: center;"><strong class="${balanceColorClass}">${balanceDisplay}</strong></td>
      <td style="text-align: right;">
        <button class="btn-table-action" onclick="event.stopPropagation(); viewEmployeeTimesheet('${emp.id}')">Ver Folha de Ponto</button>
        <button class="btn-icon" title="Editar Colaborador" onclick="event.stopPropagation(); openEditEmployeeModal('${emp.id}')">✏️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  filterEmployees();
}

// Helper to get status pill & tag styling for any status category
function getStatusPillInfo(statusCategory) {
  switch (statusCategory) {
    case 'afastado':
      return {
        label: '🟠 Afastado (INSS)',
        pillClass: 'warning',
        tagClass: 'orange',
        tagLabel: 'Afastado'
      };
    case 'demitido':
    case 'desligado':
      return {
        label: '🔴 Demitido / Desligado',
        pillClass: 'danger',
        tagClass: 'red',
        tagLabel: 'Demitido'
      };
    case 'ferias':
      return {
        label: '🌴 Em Férias',
        pillClass: 'blue',
        tagClass: 'blue',
        tagLabel: 'Férias'
      };
    case 'ativo':
    default:
      return {
        label: '🟢 Ativo',
        pillClass: 'regular',
        tagClass: 'green',
        tagLabel: 'Ativo'
      };
  }
}

// Modal Management for Editing Employee
function openEditEmployeeModal(empId) {
  const emp = employeesDB.find(e => e.id === empId);
  if (!emp) return;

  const idEl = document.getElementById('emp-edit-id');
  const nomeEl = document.getElementById('emp-edit-nome');
  const cargoEl = document.getElementById('emp-edit-cargo');
  const deptEl = document.getElementById('emp-edit-dept');
  const cpfEl = document.getElementById('emp-edit-cpf');
  const whatsappEl = document.getElementById('emp-edit-whatsapp');
  const matEl = document.getElementById('emp-edit-matricula');
  const admEl = document.getElementById('emp-edit-admission');
  const statusEl = document.getElementById('emp-edit-status');

  if (idEl) idEl.value = emp.id;
  if (nomeEl) nomeEl.value = emp.name || '';
  if (cargoEl) cargoEl.value = emp.role || '';
  if (deptEl) deptEl.value = emp.dept || emp.fullDept || '';
  if (cpfEl) cpfEl.value = emp.cpf || '';
  if (whatsappEl) whatsappEl.value = emp.whatsapp || '';
  if (matEl) matEl.value = emp.matricula || '';
  if (admEl) admEl.value = emp.admission || '';
  if (statusEl) statusEl.value = emp.statusCategory || 'ativo';

  const modal = document.getElementById('modal-edit-employee');
  if (modal) modal.style.display = 'flex';
}

function closeEditEmployeeModal() {
  const modal = document.getElementById('modal-edit-employee');
  if (modal) modal.style.display = 'none';
}

async function handleSaveEditedEmployee(e) {
  e.preventDefault();
  const id = document.getElementById('emp-edit-id')?.value;
  const emp = employeesDB.find(e => e.id === id);
  if (!emp) return;

  const nome = document.getElementById('emp-edit-nome')?.value.trim();
  const cargo = document.getElementById('emp-edit-cargo')?.value.trim();
  const dept = document.getElementById('emp-edit-dept')?.value.trim() || 'Geral';
  const cpf = document.getElementById('emp-edit-cpf')?.value.trim();
  const whatsapp = document.getElementById('emp-edit-whatsapp')?.value.trim();
  const matricula = document.getElementById('emp-edit-matricula')?.value.trim() || emp.matricula;
  const admission = document.getElementById('emp-edit-admission')?.value.trim() || emp.admission;
  const statusCategory = document.getElementById('emp-edit-status')?.value || 'ativo';

  if (!nome || !cargo || !cpf || !whatsapp) {
    alert('⚠️ Por favor, preencha todos os campos obrigatórios (*), incluindo o WhatsApp.');
    return;
  }

  const prevStatusCategory = emp.statusCategory;
  const pillInfo = getStatusPillInfo(statusCategory);

  emp.name = nome;
  emp.role = cargo;
  emp.shortRole = cargo;
  emp.dept = dept;
  emp.fullDept = `Departamento - ${dept}`;
  emp.cpf = cpf;
  emp.whatsapp = whatsapp;
  emp.matricula = matricula;
  emp.admission = admission;
  emp.statusCategory = statusCategory;
  emp.statusPillLabel = pillInfo.label;
  emp.statusPillClass = pillInfo.pillClass;
  emp.statusTag = pillInfo.tagLabel;
  emp.statusTagClass = pillInfo.tagClass;

  // Atualizar iniciais
  emp.initials = nome.trim().split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'FN';

  // Sincronizar situação nos registros diários da Folha de Ponto automaticamente
  if (statusCategory === 'ferias') {
    // Aplica Férias em todos os dias do mês atual e timesheets
    if (emp.days && Array.isArray(emp.days)) {
      emp.days.forEach(item => {
        item.status = 'ferias';
        item.e1 = '';
        item.s1 = '';
        item.e2 = '';
        item.s2 = '';
        item.signed = true;
        item.just = 'Férias Regulamentares';
      });
    }
    if (emp.timesheets) {
      Object.keys(emp.timesheets).forEach(k => {
        if (Array.isArray(emp.timesheets[k])) {
          emp.timesheets[k].forEach(item => {
            item.status = 'ferias';
            item.e1 = '';
            item.s1 = '';
            item.e2 = '';
            item.s2 = '';
            item.signed = true;
            item.just = 'Férias Regulamentares';
          });
        }
      });
    }
  } else if (statusCategory === 'afastado') {
    // Aplica Afastamento/Atestado em todos os dias
    if (emp.days && Array.isArray(emp.days)) {
      emp.days.forEach(item => {
        item.status = 'atestado';
        item.e1 = '';
        item.s1 = '';
        item.e2 = '';
        item.s2 = '';
        item.signed = true;
        item.just = 'Afastamento INSS / Licença Médica';
      });
    }
  } else if (statusCategory === 'ativo' && (prevStatusCategory === 'ferias' || prevStatusCategory === 'afastado')) {
    // Retorno ao trabalho: restabelece a jornada normal nos dias úteis
    if (emp.days && Array.isArray(emp.days)) {
      emp.days.forEach(item => {
        const holidayKey = `${item.day}-${currentMonth}`;
        if (BRAZIL_HOLIDAYS[holidayKey]) {
          item.status = 'feriado';
          item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
          item.just = BRAZIL_HOLIDAYS[holidayKey];
        } else if (item.dow === 'Sábado' || item.dow === 'Domingo') {
          item.status = 'dsr';
          item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
          item.just = item.dow === 'Sábado' ? 'Acordo de Compensação Semanal' : 'Descanso Semanal Remunerado';
        } else {
          item.status = 'presenca';
          item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';
          item.just = '';
        }
      });
    }
  }

  // Se o funcionário editado for o atualmente aberto na folha de ponto, atualizar o hero e a tabela
  if (currentEmployeeId === emp.id) {
    selectEmployee(emp.id, false);
    renderTimesheetTable();
    recalculateAllTimes();
  }

  // 1. Salvar no localStorage para persistência imediata mesmo após recarregar a página (F5)
  saveEmployeesToLocalStorage();

  // 2. Salvar e sincronizar no Supabase
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    window.supabaseService.atualizarFuncionario(emp.id, emp).catch(err => {
      console.warn('Erro ao sincronizar com Supabase:', err);
    });
  }

  // 3. Atualizar tabela administrativa, contadores e selects
  populateQuickEmployeeSelect();
  renderEmployeesAdminTable();
  const isAfastado = (statusCategory === 'afastado' || statusCategory === 'demitido' || statusCategory === 'desligado');
  const isFerias = (statusCategory === 'ferias');
  updateSidebarBadges(isAfastado, isFerias);
  closeEditEmployeeModal();

  if (statusCategory === 'afastado' || statusCategory === 'demitido' || statusCategory === 'desligado') {
    showToast(`✅ ${emp.name} alterado para "${pillInfo.tagLabel}" e movido para o filtro de Afastados & Desligados!`);
  } else if (statusCategory === 'ferias') {
    showToast(`🌴 ${emp.name} colocado em Férias! Folha de ponto atualizada e movido para o filtro Em Férias.`);
  } else {
    showToast(`✅ Dados de ${emp.name} (${pillInfo.tagLabel}) atualizados com sucesso!`);
  }
}

// Excluir Colaborador do Sistema e do Supabase
async function handleDeleteEmployeeFromModal() {
  const id = document.getElementById('emp-edit-id')?.value;
  if (!id) return;
  const emp = employeesDB.find(e => e.id === id);
  if (!emp) return;

  if (!confirm(`Tem certeza que deseja excluir "${emp.name}" do sistema e do banco de dados?`)) {
    return;
  }

  // 1. Excluir no Supabase se configurado
  if (window.supabaseService && window.supabaseService.isConfigured() && typeof window.supabaseService.excluirFuncionario === 'function') {
    try {
      await window.supabaseService.excluirFuncionario(emp.cpf || emp.id);
    } catch (err) {
      console.warn('Erro ao excluir no Supabase:', err);
    }
  }

  // 2. Excluir da base local em memória
  const index = employeesDB.findIndex(e => e.id === id);
  if (index >= 0) {
    employeesDB.splice(index, 1);
  }

  // 3. Salvar no LocalStorage
  saveEmployeesToLocalStorage();

  // 4. Atualizar interface
  closeEditEmployeeModal();
  populateQuickEmployeeSelect();
  renderEmployeesAdminTable();
  updateSidebarBadges();

  const nextEmpId = employeesDB[0]?.id || '';
  selectEmployee(nextEmpId, false);

  showToast(`🗑️ Colaborador ${emp.name} excluído com sucesso!`);
}

// Estados de visualização das notificações
let afastadosBadgeViewed = false;
let feriasBadgeViewed = false;

// Update Sidebar Badges (Afastados & Férias)
function updateSidebarBadges(hasNewAfastado = false, hasNewFerias = false) {
  if (hasNewAfastado) afastadosBadgeViewed = false;
  if (hasNewFerias) feriasBadgeViewed = false;

  // 1. Badge Afastados & Desligados
  const badgeAfastados = document.getElementById('afastados-counter-badge');
  if (badgeAfastados) {
    const countAfastados = employeesDB.filter(e => e.statusCategory === 'afastado' || e.statusCategory === 'demitido' || e.statusCategory === 'desligado').length;
    badgeAfastados.textContent = countAfastados;
    if (countAfastados > 0 && !afastadosBadgeViewed) {
      badgeAfastados.style.display = 'inline-flex';
    } else {
      badgeAfastados.style.display = 'none';
    }
  }

  // 2. Badge Em Férias
  const badgeFerias = document.getElementById('ferias-counter-badge');
  if (badgeFerias) {
    const countFerias = employeesDB.filter(e => e.statusCategory === 'ferias').length;
    badgeFerias.textContent = countFerias;
    if (countFerias > 0 && !feriasBadgeViewed) {
      badgeFerias.style.display = 'inline-flex';
    } else {
      badgeFerias.style.display = 'none';
    }
  }
}

function updateAfastadosBadgeCounter(hasNewNotification = false) {
  updateSidebarBadges(hasNewNotification, false);
}

// Switch between Active Employees, Férias, and Afastados/Desligados view
function showEmployeesView(viewMode) {
  switchScreen('screen-admin');
  
  const navEmployees = document.getElementById('nav-link-employees');
  const navFerias = document.getElementById('nav-link-ferias');
  const navAfastados = document.getElementById('nav-link-afastados');
  const titleEl = document.getElementById('admin-screen-title');
  const subtitleEl = document.getElementById('admin-screen-subtitle');
  const filterStatusEl = document.getElementById('filter-status');

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  if (viewMode === 'ferias') {
    // Ao clicar e visualizar a lista de férias, limpa o badge de notificação
    feriasBadgeViewed = true;
    updateSidebarBadges();

    if (navFerias) navFerias.classList.add('active');
    if (titleEl) titleEl.textContent = 'Colaboradores em Férias';
    if (subtitleEl) subtitleEl.textContent = 'Controle e acompanhamento de colaboradores em gozo de férias regulamentares.';
    if (filterStatusEl) filterStatusEl.value = 'ferias';
  } else if (viewMode === 'afastados') {
    // Ao clicar e visualizar a lista de afastados, limpa o badge de notificação
    afastadosBadgeViewed = true;
    updateSidebarBadges();

    if (navAfastados) navAfastados.classList.add('active');
    if (titleEl) titleEl.textContent = 'Colaboradores Afastados & Desligados';
    if (subtitleEl) subtitleEl.textContent = 'Lista e histórico de colaboradores em licença médica, afastamento INSS ou desligados da empresa.';
    if (filterStatusEl) filterStatusEl.value = 'afastados_all';
  } else {
    if (navEmployees) navEmployees.classList.add('active');
    if (titleEl) titleEl.textContent = 'Gestão de Funcionários & Controle de Ponto';
    if (subtitleEl) subtitleEl.textContent = 'Gerencie e valide a folha de ponto digital de cada colaborador em atividade.';
    if (filterStatusEl) filterStatusEl.value = 'ativo';
  }

  renderEmployeesAdminTable();
}

// Employee List Filter Logic
function filterEmployees() {
  const query = document.getElementById('filter-search')?.value.toLowerCase().trim() || '';
  const dept = document.getElementById('filter-dept')?.value || 'all';
  const status = document.getElementById('filter-status')?.value || 'all';

  const rows = document.querySelectorAll('#employees-tbody tr');

  rows.forEach(row => {
    const name = (row.dataset.name || '').toLowerCase();
    const role = (row.dataset.role || '').toLowerCase();
    const cleanQuery = query.replace(/\D/g, '');
    const rawCpf = (row.dataset.cpf || '').toLowerCase();
    const numCpf = (row.dataset.cpf || '').replace(/\D/g, '');
    const rowDept = row.dataset.dept || '';
    const rowStatus = row.dataset.status || 'ativo';

    const matchQuery = !query || name.includes(query) || role.includes(query) || rawCpf.includes(query) || (cleanQuery && numCpf.includes(cleanQuery));
    const matchDept = dept === 'all' || rowDept === dept || (row.innerText && row.innerText.includes(dept));
    
    let matchStatus = false;
    if (status === 'all') {
      matchStatus = true;
    } else if (status === 'afastados_all') {
      matchStatus = (rowStatus === 'afastado' || rowStatus === 'demitido' || rowStatus === 'desligado');
    } else if (status === 'ativo') {
      // Funcionários em atividade (exclui quem está em férias, afastado ou demitido)
      matchStatus = (rowStatus !== 'afastado' && rowStatus !== 'demitido' && rowStatus !== 'desligado' && rowStatus !== 'ferias');
    } else if (status === 'afastado') {
      matchStatus = (rowStatus === 'afastado');
    } else if (status === 'demitido') {
      matchStatus = (rowStatus === 'demitido' || rowStatus === 'desligado');
    } else if (status === 'ferias') {
      matchStatus = (rowStatus === 'ferias');
    } else {
      matchStatus = (rowStatus === status);
    }

    if (matchQuery && matchDept && matchStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });

  updateSidebarBadges();
}

function resetFilters() {
  if (document.getElementById('filter-search')) document.getElementById('filter-search').value = '';
  if (document.getElementById('filter-dept')) document.getElementById('filter-dept').value = 'all';
  if (document.getElementById('filter-status')) document.getElementById('filter-status').value = 'all';
  filterEmployees();
  showToast('Filtros redefinidos');
}

// Navigation to employee timesheet from list / filter
function viewEmployeeTimesheet(employeeIdOrName) {
  selectEmployee(employeeIdOrName, true);
}

// Modal Management for New Employee
function openNewEmployeeModal() {
  const modal = document.getElementById('modal-new-employee');
  const form = document.getElementById('form-new-employee');
  if (form) form.reset();

  const btnSubmit = document.getElementById('btn-submit-employee');
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Salvar`;
  }

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      document.getElementById('emp-input-nome')?.focus();
    }, 50);
  }
}

function closeNewEmployeeModal() {
  const modal = document.getElementById('modal-new-employee');
  if (modal) modal.style.display = 'none';
}

// Masking and Modal Listeners
document.addEventListener('DOMContentLoaded', () => {
  const cpfInput = document.getElementById('emp-input-cpf');
  const editCpfInput = document.getElementById('emp-edit-cpf');
  const phoneInput = document.getElementById('emp-input-whatsapp');
  const editPhoneInput = document.getElementById('emp-edit-whatsapp');

  const formatPhoneValue = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    
    if (v.length === 0) return '';
    if (v.length <= 2) return `(${v}`;
    if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7, 11)}`;
  };

  const applyPhoneMask = (e) => {
    e.target.value = formatPhoneValue(e.target.value);
  };

  const formatCpfValue = (val) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length === 0) return '';
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
  };

  const applyCpfMask = (e) => {
    e.target.value = formatCpfValue(e.target.value);
  };

  if (cpfInput) {
    cpfInput.addEventListener('input', applyCpfMask);
    cpfInput.addEventListener('blur', applyCpfMask);
  }
  if (editCpfInput) {
    editCpfInput.addEventListener('input', applyCpfMask);
    editCpfInput.addEventListener('blur', applyCpfMask);
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', applyPhoneMask);
    phoneInput.addEventListener('blur', applyPhoneMask);
  }
  if (editPhoneInput) {
    editPhoneInput.addEventListener('input', applyPhoneMask);
    editPhoneInput.addEventListener('blur', applyPhoneMask);
  }

  // Close modals when clicking backdrop
  const modalNew = document.getElementById('modal-new-employee');
  const modalEdit = document.getElementById('modal-edit-employee');

  if (modalNew) {
    modalNew.addEventListener('click', (e) => {
      if (e.target === modalNew) closeNewEmployeeModal();
    });
  }

  if (modalEdit) {
    modalEdit.addEventListener('click', (e) => {
      if (e.target === modalEdit) closeEditEmployeeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNewEmployeeModal();
      closeEditEmployeeModal();
    }
  });
});

// Handle Form Submission -> Insert into Supabase
async function handleCreateEmployee(e) {
  e.preventDefault();

  const nome = document.getElementById('emp-input-nome')?.value.trim();
  const cargo = document.getElementById('emp-input-cargo')?.value.trim();
  const cpf = document.getElementById('emp-input-cpf')?.value.trim();
  const whatsapp = document.getElementById('emp-input-whatsapp')?.value.trim();

  if (!nome || !cargo || !cpf || !whatsapp) {
    alert('⚠️ Por favor, preencha todos os campos obrigatórios (*), incluindo o WhatsApp.');
    return;
  }

  const btnSubmit = document.getElementById('btn-submit-employee');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `⏳ Salvando...`;
  }

  let success = false;

  // 1. Inserir no Supabase se configurado
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    const result = await window.supabaseService.cadastrarFuncionario(nome, cargo, cpf, whatsapp);
    if (result && result.length > 0) {
      success = true;
    }
  }

  // 2. Se salvou ou fallback local, atualizar base em memória e UI
  const newId = nome.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000);
  const initials = nome.trim().split(/\s+/).map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'FN';
  const colors = ['green', 'blue', 'purple', 'orange', 'red'];
  const color = colors[employeesDB.length % colors.length];

  const newEmp = {
    id: newId,
    name: nome,
    initials: initials,
    color: color,
    role: cargo,
    shortRole: cargo,
    dept: 'Operacional',
    fullDept: `Departamento - ${cargo}`,
    admission: new Date().toLocaleDateString('pt-BR'),
    cpf: cpf,
    whatsapp: whatsapp,
    pis: '000.00000.00-0',
    matricula: String(employeesDB.length + 1).padStart(4, '0'),
    statusTag: 'Ativo',
    statusTagClass: color,
    statusCategory: 'ativo',
    statusPillLabel: '🟢 Ativo',
    statusPillClass: 'regular',
    days: generateCurrentMonthData(currentYear, currentMonth, newId)
  };

  // Se o Supabase estiver conectado, recarrega a lista oficial do banco
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    const dbEmployees = await window.supabaseService.loadEmployees();
    if (dbEmployees && dbEmployees.length > 0) {
      for (const emp of dbEmployees) {
        if (!emp.days || emp.days.length === 0) {
          emp.days = generateCurrentMonthData(currentYear, currentMonth, emp.id);
        }
        if (!emp.whatsapp && emp.cpf && emp.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '')) {
          emp.whatsapp = whatsapp;
        }
      }
      employeesDB.length = 0;
      employeesDB.push(...dbEmployees);
    } else {
      employeesDB.push(newEmp);
    }
  } else {
    employeesDB.push(newEmp);
  }

  // Atualizar componentes da interface e persistência
  saveEmployeesToLocalStorage();
  populateQuickEmployeeSelect();
  renderEmployeesAdminTable();
  updateAfastadosBadgeCounter();
  closeNewEmployeeModal();

  showToast(`🎉 Colaborador ${nome} cadastrado com sucesso no Supabase!`);
}

// Accountant Actions / Multi-Page Print
function generateDemonstrativoPDF() {
  printAllEmployeesTimesheets();
}

// Build Print Page HTML for a single employee
function buildEmployeePrintPageHtml(emp, pageNum = 1, totalPages = 1) {
  let totalPresencas = 0;
  let totalExtraMins = 0;
  let totalAtrasoMins = 0;
  let totalWorkedMins = 0;
  let totalFaltas = 0;

  if (emp.days && Array.isArray(emp.days)) {
    emp.days.forEach(item => {
      if (item.status === 'presenca' && (item.e1 || item.s1 || item.e2 || item.s2)) {
        totalPresencas++;
        const m = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
        totalWorkedMins += m.workedMins;
        if (m.balanceMins > 0) totalExtraMins += m.balanceMins;
        if (m.balanceMins < 0) totalAtrasoMins += Math.abs(m.balanceMins);
      } else if (item.status === 'falta') {
        totalFaltas++;
      }
    });
  }

  const netBalanceMins = totalExtraMins - totalAtrasoMins;

  let rowsHtml = '';
  if (emp.days && Array.isArray(emp.days)) {
    emp.days.forEach(item => {
      const dayPad = String(item.day).padStart(2, '0');
      const monthPad = String(currentMonth).padStart(2, '0');
      const metrics = calcDayMetrics(item.e1, item.s1, item.e2, item.s2, item.status, item.dow);
      let rowBgClass = '';
      if (item.status === 'dsr' || item.status === 'feriado') rowBgClass = 'print-weekend-row';
      else if (item.status === 'falta') rowBgClass = 'print-falta-row';
      else if (item.status === 'atestado') rowBgClass = 'print-atestado-row';
      else if (item.status === 'justificada') rowBgClass = 'print-justificada-row';
      else if (item.status === 'ferias') rowBgClass = 'print-ferias-row';

      rowsHtml += `
        <tr class="${rowBgClass}">
          <td class="col-day"><strong>${dayPad}/${monthPad}</strong> <small>${item.dow.slice(0, 3)}</small></td>
          <td class="col-time">${item.e1 || '--:--'}</td>
          <td class="col-time">${(item.s1 && item.e2) ? `${item.s1} às ${item.e2}` : (item.s1 || item.e2 ? `${item.s1 || '--:--'} - ${item.e2 || '--:--'}` : '--:--')}</td>
          <td class="col-time">${item.s2 || '--:--'}</td>
          <td class="col-balance ${metrics.extraType}" style="text-align: center;">${metrics.formattedExtra}</td>
          <td class="col-status" style="text-align: center;"><span class="print-badge ${item.status || 'presenca'}">${getStatusLabel(item.status)}</span></td>
          <td class="col-sig" style="text-align: center;"><span class="print-sig-rubrica">${item.signed !== false ? emp.initials : '—'}</span></td>
        </tr>
      `;
    });
  }

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const sigData = (emp.signatures && emp.signatures[monthKey]) || emp.digitalSignature;
  const companySigData = (typeof systemSettings !== 'undefined' && systemSettings.autoApplyCompanySig !== false && systemSettings.companySignature) || (emp.signatures && emp.signatures[monthKey]?.companySignature);

  const page = document.createElement('div');
  page.className = 'print-page';

  page.innerHTML = `
    <div class="print-doc-header">
      <div class="print-brand-row">
        <div class="print-brand-col-left">
          <img src="logo-lane.jpg" alt="Logo Lane Comunicações" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #CBD5E1;">
          <div class="print-brand">
            <strong>${(typeof systemSettings !== 'undefined' && systemSettings.companyName) ? systemSettings.companyName : 'LANE RO COMUNICAÇÕES LTDA'}</strong>
            <span>${(typeof systemSettings !== 'undefined' && systemSettings.companyAddress) ? systemSettings.companyAddress : 'RUA WINIFRED AVINEL WILES'}</span>
            <span>CNPJ/CAEPF: ${(typeof systemSettings !== 'undefined' && systemSettings.companyCnpj) ? systemSettings.companyCnpj : '43.557.034/0001-94'}</span>
          </div>
        </div>
        <div class="print-doc-title">
          <h3>FOLHA DE PONTO INDIVIDUAL DE TRABALHO</h3>
        </div>
        <div class="print-page-num">
          <span>Página ${pageNum} de ${totalPages}</span>
          <small>Competência: ${MONTH_NAMES[currentMonth - 1]}/${currentYear}</small>
        </div>
      </div>

      <div class="print-emp-card">
        <div class="print-emp-avatar ${emp.color || 'green'}">${emp.initials || 'FN'}</div>
        <div class="print-emp-info">
          <div class="print-emp-topline">
            <h4>${emp.name}</h4>
            <span class="print-tag">Matrícula: ${emp.matricula || '0001'}</span>
            <span class="print-tag">${emp.statusTag || 'Ativo'}</span>
          </div>
          <div class="print-emp-details">
            <span><strong>Cargo:</strong> ${emp.role}</span>
            <span><strong>Departamento:</strong> ${emp.fullDept || emp.dept}</span>
            <span><strong>CPF:</strong> ${emp.cpf}</span>
          </div>
        </div>
      </div>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 14%;">Dia / Data</th>
          <th style="width: 12%;">Entrada</th>
          <th style="width: 22%;">Intervalo Refeição</th>
          <th style="width: 12%;">Saída</th>
          <th style="width: 14%;">Horas Extras</th>
          <th style="width: 13%;">Situação</th>
          <th style="width: 13%;">Assinatura</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="print-summary-grid">
      <div class="print-stat-item">
        <span class="stat-lbl">Dias Trabalhados</span>
        <strong class="stat-num">${totalPresencas} dias</strong>
        <small>${totalWorkedMins > 0 ? minutesToTime(totalWorkedMins) + 'h total' : '160h normais'}</small>
      </div>
      <div class="print-stat-item">
        <span class="stat-lbl">Horas Extras</span>
        <strong class="stat-num text-success">+${minutesToTime(totalExtraMins)}h</strong>
        <small>Acréscimo 50%/100%</small>
      </div>
      <div class="print-stat-item">
        <span class="stat-lbl">Atrasos / Saídas</span>
        <strong class="stat-num text-warning">-${minutesToTime(totalAtrasoMins)}h</strong>
        <small>Dentro banco</small>
      </div>
      <div class="print-stat-item">
        <span class="stat-lbl">Saldo Banco Horas</span>
        <strong class="stat-num">${netBalanceMins >= 0 ? '+' : ''}${minutesToTime(netBalanceMins)}h</strong>
        <small>Saldo acumulado ${MONTH_NAMES[currentMonth - 1].slice(0, 3)}/${String(currentYear).slice(-2)}</small>
      </div>
      <div class="print-stat-item">
        <span class="stat-lbl">Faltas Injustificadas</span>
        <strong class="stat-num text-danger">${String(totalFaltas).padStart(2, '0')} dia</strong>
        <small>Desconto DSR</small>
      </div>
    </div>

    <div class="print-footer-signatures">
      <div class="print-sig-row">
        <div class="print-sig-box">
          ${sigData ? `
            <div style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin-bottom: 2px;">
              <img src="${sigData.image || sigData}" alt="Assinatura Digital" style="max-height: 40px; max-width: 180px; object-fit: contain; display: block; filter: contrast(1.2);">
              <div style="font-size: 5.5pt; color: #047857; font-weight: 700; display: flex; align-items: center; gap: 3px; margin-top: 1px;">
                <span>🔒</span> Assinado digitalmente em ${sigData.signedAt || new Date().toLocaleDateString('pt-BR')} ${sigData.hash ? `(${sigData.hash})` : ''}
              </div>
            </div>
            <div class="sig-line" style="margin-top: 2px !important;"></div>
          ` : `
            <div class="sig-line" style="margin-top: 26px !important;"></div>
          `}
          <strong>${emp.name}</strong>
          <span>Assinatura do Empregado — CPF: ${emp.cpf}</span>
          <small>Data: ${sigData ? (sigData.dateOnly || sigData.signedAt?.split(' ')[0] || new Date().toLocaleDateString('pt-BR')) : `____/____/${currentYear}`}</small>
        </div>
        <div class="print-sig-box">
          ${companySigData ? `
            <div style="min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin-bottom: 2px;">
              <img src="${companySigData.image || companySigData}" alt="Assinatura Empregador" style="max-height: 40px; max-width: 180px; object-fit: contain; display: block; filter: contrast(1.2);">
              <div style="font-size: 5.5pt; color: #047857; font-weight: 700; display: flex; align-items: center; gap: 3px; margin-top: 1px;">
                <span>🔒</span> Assinado pelo Empregador em ${companySigData.signedAt || new Date().toLocaleDateString('pt-BR')} ${companySigData.hash ? `(${companySigData.hash})` : ''}
              </div>
            </div>
            <div class="sig-line" style="margin-top: 2px !important;"></div>
          ` : `
            <div class="sig-line" style="margin-top: 26px !important;"></div>
          `}
          <strong>${(typeof systemSettings !== 'undefined' && systemSettings.managerName) ? systemSettings.managerName : 'Roberto Silva'} (Gestor)</strong>
          <span>Pelo Empregador — ${(typeof systemSettings !== 'undefined' && systemSettings.companyName) ? systemSettings.companyName : 'LANE RO COMUNICAÇÕES LTDA'}</span>
          <small>CNPJ/CAEPF: ${(typeof systemSettings !== 'undefined' && systemSettings.companyCnpj) ? systemSettings.companyCnpj : '43.557.034/0001-94'}</small>
        </div>
      </div>
    </div>
  `;

  return page;
}

// Multi-Page Print Generation (1 Page per registered Employee)
function generateAllEmployeesPrintView() {
  const container = document.getElementById('print-all-container');
  if (!container) return;

  container.innerHTML = '';
  employeesDB.forEach((emp, empIdx) => {
    const page = buildEmployeePrintPageHtml(emp, empIdx + 1, employeesDB.length);
    container.appendChild(page);
  });
}

// Single Employee Print Generation (Only Current Employee)
function generateSingleEmployeePrintView(emp) {
  const container = document.getElementById('print-all-container');
  if (!container) return;

  container.innerHTML = '';
  const page = buildEmployeePrintPageHtml(emp, 1, 1);
  container.appendChild(page);
}

// Print ONLY Current Employee Timesheet (1 Page PDF)
function printCurrentEmployeeTimesheet() {
  const emp = getCurrentEmployee();
  showToast(`📄 Gerando PDF da folha de ponto de ${emp.name}...`);
  generateSingleEmployeePrintView(emp);
  setTimeout(() => {
    window.print();
  }, 350);
}

// Print All Employees (Multi-page PDF)
function printAllEmployeesTimesheets() {
  showToast(`📄 Gerando PDF de todos os ${employeesDB.length} colaboradores (1 página por funcionário)...`);
  generateAllEmployeesPrintView();
  setTimeout(() => {
    window.print();
  }, 400);
}

function aprovarFolhaParaPagamento() {
  const emp = getCurrentEmployee();
  showToast(`✅ Folha de ${emp.name} aprovada com sucesso! Arquivo transmitido para o eSocial.`);
}

function solicitarAjusteModal() {
  const emp = getCurrentEmployee();
  showToast(`Notificação enviada ao Gestor solicitando justificativa para ${emp.name}.`);
}

// Export Portaria 671 AFD TXT
function exportAFDFile() {
  const emp = getCurrentEmployee();
  const mPad = String(currentMonth).padStart(2, '0');
  let content = `00000000011112345678000190123456789012INDÚSTRIA E COMÉRCIO EXEMPLO LTDA\n`;
  emp.days.forEach(item => {
    if (item.e1) {
      content += `0000000003${String(item.day).padStart(2, '0')}${mPad}${currentYear}${item.e1.replace(':', '')}00000012045678901\n`;
    }
    if (item.s1) {
      content += `0000000003${String(item.day).padStart(2, '0')}${mPad}${currentYear}${item.s1.replace(':', '')}00000012045678901\n`;
    }
    if (item.e2) {
      content += `0000000003${String(item.day).padStart(2, '0')}${mPad}${currentYear}${item.e2.replace(':', '')}00000012045678901\n`;
    }
    if (item.s2) {
      content += `0000000003${String(item.day).padStart(2, '0')}${mPad}${currentYear}${item.s2.replace(':', '')}00000012045678901\n`;
    }
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = emp.name.replace(/\s+/g, '');
  a.download = `AFD_Portaria671_${MONTH_NAMES[currentMonth - 1]}_${currentYear}_${safeName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Arquivo AFD (${MONTH_NAMES[currentMonth - 1]}/${currentYear}) de ${emp.name} baixado com sucesso!`);
}

function addCustomRow() {
  showToast('Adicione horários nos campos editáveis da tabela.');
}

// Toast System (Desativado a pedido do usuário - sem balões popups na tela)
function showToast(msg) {
  // Desativado: nenhum balão popup será exibido
  return;
}

// ==========================================================================
// Painel de Configurações do Sistema & Backup
// ==========================================================================
const SYSTEM_SETTINGS_KEY = 'lane_system_settings_v3';

let systemSettings = {
  companyName: 'Lane RO Comunicações LTDA',
  companyCnpj: '43.557.034/0001-94',
  managerName: 'Roberto Silva (Admin)',
  companyAddress: 'Rua Winifred Avinel Wiles',
  workHoursWeekday: 480, // 8h diárias
  workHoursSaturday: 240, // 4h sábado
  toleranceMinutes: 10
};

function loadSystemSettings() {
  try {
    const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      systemSettings = { ...systemSettings, ...parsed };
    }
    // Migração de dados caso o usuário tenha defaults antigos em cache
    if (!systemSettings.companyCnpj || systemSettings.companyCnpj === '12.345.678/0001-90') {
      systemSettings.companyCnpj = '43.557.034/0001-94';
    }
    if (!systemSettings.companyName || systemSettings.companyName === 'Lane Comunicações' || systemSettings.companyName === 'LANE COMUNICAÇÕES') {
      systemSettings.companyName = 'Lane RO Comunicações LTDA';
    }
    if (!systemSettings.companyAddress || systemSettings.companyAddress.includes('Paulista')) {
      systemSettings.companyAddress = 'Rua Winifred Avinel Wiles';
    }
    localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));
  } catch (e) {
    console.warn('Erro ao carregar configurações:', e);
  }
  applySystemSettingsToUI();
}

function applySystemSettingsToUI() {
  const suiteBrand = document.querySelector('.suite-logo strong');
  if (suiteBrand) suiteBrand.textContent = systemSettings.companyName || 'Lane RO Comunicações LTDA';

  const sidebarBrand = document.querySelector('.sidebar-brand h3');
  if (sidebarBrand) sidebarBrand.textContent = systemSettings.companyName || 'Lane RO Comunicações LTDA';

  const sidebarUserName = document.querySelector('.sidebar-user .user-name');
  if (sidebarUserName) sidebarUserName.textContent = systemSettings.managerName || 'Roberto Silva (Admin)';
}

function openSettingsModal() {
  loadSystemSettings();

  const nameEl = document.getElementById('setting-company-name');
  const cnpjEl = document.getElementById('setting-company-cnpj');
  const managerEl = document.getElementById('setting-manager-name');
  const addrEl = document.getElementById('setting-company-address');
  const weekdayEl = document.getElementById('setting-work-hours-weekday');
  const satEl = document.getElementById('setting-work-hours-saturday');
  const tolEl = document.getElementById('setting-clt-tolerance');
  const autoApplyEl = document.getElementById('setting-auto-apply-company-sig');

  if (nameEl) nameEl.value = systemSettings.companyName || 'Lane RO Comunicações LTDA';
  if (cnpjEl) cnpjEl.value = systemSettings.companyCnpj || '43.557.034/0001-94';
  if (managerEl) managerEl.value = systemSettings.managerName || 'Roberto Silva (Admin)';
  if (addrEl) addrEl.value = systemSettings.companyAddress || 'Rua Winifred Avinel Wiles';
  if (weekdayEl) weekdayEl.value = String(systemSettings.workHoursWeekday ?? 480);
  if (satEl) satEl.value = String(systemSettings.workHoursSaturday ?? 240);
  if (tolEl) tolEl.value = String(systemSettings.toleranceMinutes ?? 10);
  if (autoApplyEl) autoApplyEl.checked = (systemSettings.autoApplyCompanySig !== false);

  setSettingsTab('empresa');
  const modal = document.getElementById('modal-settings');
  if (modal) modal.style.display = 'flex';
}

function closeSettingsModal() {
  const modal = document.getElementById('modal-settings');
  if (modal) modal.style.display = 'none';
}

function setSettingsTab(tabName) {
  const tabEmp = document.getElementById('tab-settings-empresa');
  const tabJor = document.getElementById('tab-settings-jornada');
  const tabAss = document.getElementById('tab-settings-assinatura');

  const secEmp = document.getElementById('section-settings-empresa');
  const secJor = document.getElementById('section-settings-jornada');
  const secAss = document.getElementById('section-settings-assinatura');

  const allTabs = [
    { name: 'empresa', tab: tabEmp, sec: secEmp },
    { name: 'jornada', tab: tabJor, sec: secJor },
    { name: 'assinatura', tab: tabAss, sec: secAss }
  ];

  allTabs.forEach(item => {
    if (item.name === tabName) {
      if (item.tab) {
        item.tab.classList.add('active');
        item.tab.style.background = '#FFFFFF';
        item.tab.style.color = '#065F46';
        item.tab.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }
      if (item.sec) item.sec.style.display = 'flex';
    } else {
      if (item.tab) {
        item.tab.classList.remove('active');
        item.tab.style.background = 'transparent';
        item.tab.style.color = '#64748B';
        item.tab.style.boxShadow = 'none';
      }
      if (item.sec) item.sec.style.display = 'none';
    }
  });

  if (tabName === 'assinatura') {
    setTimeout(() => {
      initCompanySettingSigCanvas();
      if (systemSettings.companySignature) {
        loadExistingCompanySigOnSettingCanvas(systemSettings.companySignature.image || systemSettings.companySignature);
      }
    }, 80);
  }
}

function saveSystemSettings() {
  const companyName = document.getElementById('setting-company-name')?.value.trim() || 'Lane RO Comunicações LTDA';
  const companyCnpj = document.getElementById('setting-company-cnpj')?.value.trim() || '43.557.034/0001-94';
  const managerName = document.getElementById('setting-manager-name')?.value.trim() || 'Roberto Silva (Admin)';
  const companyAddress = document.getElementById('setting-company-address')?.value.trim() || 'Rua Winifred Avinel Wiles';
  const workHoursWeekday = parseInt(document.getElementById('setting-work-hours-weekday')?.value, 10) || 480;
  const workHoursSaturday = parseInt(document.getElementById('setting-work-hours-saturday')?.value, 10) || 240;
  const toleranceMinutes = parseInt(document.getElementById('setting-clt-tolerance')?.value, 10) || 10;
  const autoApplyCompanySig = document.getElementById('setting-auto-apply-company-sig')?.checked !== false;

  let compSig = systemSettings.companySignature || null;
  if (companySettingSigHasDrawn) {
    const canvas = document.getElementById('company-setting-sig-canvas');
    if (canvas) {
      compSig = {
        image: canvas.toDataURL('image/png'),
        signedAt: new Date().toLocaleString('pt-BR'),
        dateOnly: new Date().toLocaleDateString('pt-BR'),
        managerName: managerName,
        hash: 'LANE-EMPR-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      };
    }
  }

  systemSettings = {
    ...systemSettings,
    companyName,
    companyCnpj,
    managerName,
    companyAddress,
    workHoursWeekday,
    workHoursSaturday,
    toleranceMinutes,
    autoApplyCompanySig,
    companySignature: compSig
  };

  try {
    localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));
  } catch (e) {
    console.warn(e);
  }

  applySystemSettingsToUI();
  closeSettingsModal();
  recalculateAllTimes();
  renderTimesheetTable();
  renderEmployeesAdminTable();
}

function exportSystemBackupJson() {
  try {
    const backupData = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      systemSettings,
      employees: employeesDB
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_ponto_facil_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Erro ao exportar backup:', e);
  }
}

function importSystemBackupJson(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && Array.isArray(data.employees) && data.employees.length > 0) {
        employeesDB.length = 0;
        employeesDB.push(...data.employees);
        if (data.systemSettings) {
          systemSettings = { ...systemSettings, ...data.systemSettings };
          localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));
          applySystemSettingsToUI();
        }
        saveEmployeesToLocalStorage();
        populateQuickEmployeeSelect();
        renderEmployeesAdminTable();
        updateSidebarBadges();
        selectEmployee(employeesDB[0].id, false);
        closeSettingsModal();
      }
    } catch (err) {
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function resetToDemoData() {
  if (confirm('Deseja realmente restaurar os dados de fábrica? Todas as alterações locais serão substituídas pelos funcionários de demonstração.')) {
    localStorage.removeItem(LOCAL_STORAGE_EMPLOYEES_KEY);
    localStorage.removeItem(SYSTEM_SETTINGS_KEY);
    window.location.reload();
  }
}

// ==========================================================================
// Gestão de Atestados & Justificativas (Observações e Fotos / PDFs)
// ==========================================================================
let currentJustAttachment = null;

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function openJustificationModal(index, preselectedStatus = null) {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[index]) return;

  const item = emp.days[index];
  const dayIdxInput = document.getElementById('just-day-index');
  if (dayIdxInput) dayIdxInput.value = index;

  const dayPad = String(item.day).padStart(2, '0');
  const monthPad = String(currentMonth).padStart(2, '0');
  const subtitle = document.getElementById('just-modal-subtitle');
  if (subtitle) {
    subtitle.textContent = `Dia ${dayPad}/${monthPad}/${currentYear} (${item.dow}) — ${emp.name}`;
  }

  // Define status a ser editado
  const statusToUse = preselectedStatus || item.status || 'atestado';
  const effectiveStatus = (statusToUse === 'justificada') ? 'justificada' : 'atestado';

  // Radio selection
  const radios = document.getElementsByName('just-status-radio');
  radios.forEach(r => {
    r.checked = (r.value === effectiveStatus);
  });
  updateJustTypeSelection(effectiveStatus);

  // Prefill observation text
  const obsTextarea = document.getElementById('just-obs-text');
  if (obsTextarea) {
    obsTextarea.value = item.just || '';
  }

  // Prefill existing attachment if present
  const previewBox = document.getElementById('just-attachment-preview-box');
  const dropzone = document.getElementById('just-upload-dropzone');
  const fileInput = document.getElementById('just-file-input');
  if (fileInput) fileInput.value = '';

  if (item.attachmentData) {
    currentJustAttachment = {
      data: item.attachmentData,
      name: item.attachmentName || 'comprovante',
      type: item.attachmentType || 'image/jpeg',
      size: item.attachmentSize || 'Anexo'
    };
    renderJustificationAttachmentPreview(currentJustAttachment);
  } else {
    currentJustAttachment = null;
    if (previewBox) previewBox.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';
  }

  // Show modal
  const modal = document.getElementById('modal-justification');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeJustificationModal() {
  const modal = document.getElementById('modal-justification');
  if (modal) {
    modal.style.display = 'none';
  }
  currentJustAttachment = null;
}

function handleJustificationBackdropClick(event) {
  if (event.target && event.target.id === 'modal-justification') {
    closeJustificationModal();
  }
}

function updateJustTypeSelection(type) {
  const labelAtestado = document.getElementById('just-type-atestado-label');
  const labelJustificada = document.getElementById('just-type-justificada-label');
  const title = document.getElementById('just-modal-title');
  const icon = document.getElementById('just-modal-icon-badge');
  const saveBtn = document.getElementById('btn-save-justification');

  if (type === 'atestado') {
    if (labelAtestado) {
      labelAtestado.style.borderColor = '#F59E0B';
      labelAtestado.style.background = '#FFFBEB';
      labelAtestado.style.color = '#92400E';
    }
    if (labelJustificada) {
      labelJustificada.style.borderColor = '#CBD5E1';
      labelJustificada.style.background = '#F8FAFC';
      labelJustificada.style.color = '#64748B';
    }
    if (title) title.textContent = 'Atestado Médico';
    if (icon) {
      icon.textContent = '🩺';
      icon.style.background = '#EA580C';
    }
    if (saveBtn) {
      saveBtn.style.background = '#EA580C';
      saveBtn.style.borderColor = '#EA580C';
    }
  } else {
    if (labelJustificada) {
      labelJustificada.style.borderColor = '#EAB308';
      labelJustificada.style.background = '#FEFCE8';
      labelJustificada.style.color = '#854D0E';
    }
    if (labelAtestado) {
      labelAtestado.style.borderColor = '#CBD5E1';
      labelAtestado.style.background = '#F8FAFC';
      labelAtestado.style.color = '#64748B';
    }
    if (title) title.textContent = 'Justificativa de Ausência';
    if (icon) {
      icon.textContent = '📝';
      icon.style.background = '#CA8A04';
    }
    if (saveBtn) {
      saveBtn.style.background = '#CA8A04';
      saveBtn.style.borderColor = '#CA8A04';
    }
  }
}

function handleJustificationFileSelected(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    alert('O arquivo selecionado é muito grande. Por favor, envie uma foto ou PDF de até 15MB.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentJustAttachment = {
      data: e.target.result,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: formatBytes(file.size)
    };
    renderJustificationAttachmentPreview(currentJustAttachment);
  };
  reader.readAsDataURL(file);
}

function renderJustificationAttachmentPreview(att) {
  const previewBox = document.getElementById('just-attachment-preview-box');
  const dropzone = document.getElementById('just-upload-dropzone');
  const thumbContainer = document.getElementById('just-preview-thumb-container');
  const nameEl = document.getElementById('just-preview-filename');
  const sizeEl = document.getElementById('just-preview-filesize');

  if (!att || !previewBox || !dropzone) return;

  if (nameEl) nameEl.textContent = att.name || 'comprovante';
  if (sizeEl) sizeEl.textContent = att.size || '';

  if (thumbContainer) {
    if (att.type && att.type.includes('pdf')) {
      thumbContainer.innerHTML = '<span style="font-size: 1.8rem;">📄</span>';
    } else {
      thumbContainer.innerHTML = `<img src="${att.data}" alt="Pré-visualização" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  }

  dropzone.style.display = 'none';
  previewBox.style.display = 'block';
}

function removeJustificationAttachment() {
  currentJustAttachment = null;
  const fileInput = document.getElementById('just-file-input');
  if (fileInput) fileInput.value = '';

  const previewBox = document.getElementById('just-attachment-preview-box');
  const dropzone = document.getElementById('just-upload-dropzone');
  if (previewBox) previewBox.style.display = 'none';
  if (dropzone) dropzone.style.display = 'block';
}

function handleSaveJustification(event) {
  if (event) event.preventDefault();

  const dayIdxInput = document.getElementById('just-day-index');
  if (!dayIdxInput || dayIdxInput.value === '') return;

  const idx = parseInt(dayIdxInput.value, 10);
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[idx]) return;

  const item = emp.days[idx];

  let selectedStatus = 'atestado';
  const radios = document.getElementsByName('just-status-radio');
  for (const r of radios) {
    if (r.checked) {
      selectedStatus = r.value;
      break;
    }
  }

  const obsText = document.getElementById('just-obs-text')?.value?.trim() || '';

  item.status = selectedStatus;
  item.just = obsText;
  item.signed = true;
  item.e1 = ''; item.s1 = ''; item.e2 = ''; item.s2 = '';

  if (currentJustAttachment) {
    item.attachmentData = currentJustAttachment.data;
    item.attachmentName = currentJustAttachment.name;
    item.attachmentType = currentJustAttachment.type;
    item.attachmentSize = currentJustAttachment.size;
  } else {
    delete item.attachmentData;
    delete item.attachmentName;
    delete item.attachmentType;
    delete item.attachmentSize;
  }

  // Persist to current month timesheet
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (!emp.timesheets) emp.timesheets = {};
  emp.timesheets[monthKey] = JSON.parse(JSON.stringify(emp.days));

  saveEmployeesToLocalStorage();
  if (window.supabaseService && window.supabaseService.isConfigured() && typeof window.supabaseService.saveFullTimesheet === 'function') {
    window.supabaseService.saveFullTimesheet(emp.id, monthKey, emp.days).catch(err => console.warn(err));
  }

  closeJustificationModal();
  renderTimesheetTable();
  recalculateAllTimes();
  renderEmployeesAdminTable();
}

function openCurrentAttachmentViewer() {
  if (currentJustAttachment && currentJustAttachment.data) {
    showAttachmentViewer(currentJustAttachment.data, currentJustAttachment.name, currentJustAttachment.type);
    return;
  }
  const dayIdxInput = document.getElementById('just-day-index');
  if (dayIdxInput && dayIdxInput.value !== '') {
    const idx = parseInt(dayIdxInput.value, 10);
    openAttachmentModalView(idx);
  }
}

function openAttachmentModalView(index) {
  const emp = getCurrentEmployee();
  if (!emp || !emp.days || !emp.days[index]) return;

  const item = emp.days[index];
  if (!item.attachmentData) return;

  showAttachmentViewer(item.attachmentData, item.attachmentName || `comprovante_${item.day}`, item.attachmentType || 'image/jpeg');
}

function showAttachmentViewer(dataUrl, name = 'comprovante', type = '') {
  const modal = document.getElementById('modal-attachment-viewer');
  const container = document.getElementById('viewer-body-container');
  const title = document.getElementById('viewer-title');
  const downloadLink = document.getElementById('viewer-download-link');
  const typeIcon = document.getElementById('viewer-type-icon');

  if (!modal || !container) return;

  if (title) title.textContent = name || 'Visualizar Comprovante';
  if (downloadLink) {
    downloadLink.href = dataUrl;
    downloadLink.download = name || 'comprovante';
  }

  const isPdf = (type && type.includes('pdf')) || (dataUrl && dataUrl.startsWith('data:application/pdf'));

  if (typeIcon) {
    typeIcon.textContent = isPdf ? '📄' : '📷';
  }

  if (isPdf) {
    container.innerHTML = `
      <iframe src="${dataUrl}" style="width: 100%; height: 100%; border: none; background: #FFF;" title="${name}"></iframe>
    `;
  } else {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
        <img src="${dataUrl}" alt="${name}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      </div>
    `;
  }

  modal.style.display = 'flex';
}

function closeAttachmentModalView() {
  const modal = document.getElementById('modal-attachment-viewer');
  const container = document.getElementById('viewer-body-container');
  if (modal) modal.style.display = 'none';
  if (container) container.innerHTML = '';
}

function handleAttachmentViewerBackdropClick(event) {
  if (event.target && event.target.id === 'modal-attachment-viewer') {
    closeAttachmentModalView();
  }
}

/* ========================================================================== */
/* MÓDULO DE ASSINATURA DIGITAL & ENVIO VIA WHATSAPP                          */
/* ========================================================================== */

let currentSigTargetEmpId = '';
let currentSigTargetMonthKey = '';
let sigCanvasInitialized = false;
let sigHasDrawn = false;
let sigIsDrawing = false;
let sigLastX = 0;
let sigLastY = 0;

// Atualiza o selo visual de assinatura no Hero Card do colaborador
function updateHeroSignatureBadge(emp) {
  const badgeEl = document.getElementById('emp-hero-sig-badge');
  if (!badgeEl) return;

  if (!emp) {
    badgeEl.style.display = 'none';
    return;
  }

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const sig = (emp.signatures && emp.signatures[monthKey]) || emp.digitalSignature;

  if (sig) {
    badgeEl.style.display = 'inline-flex';
    badgeEl.style.background = '#ECFDF5';
    badgeEl.style.color = '#047857';
    badgeEl.style.border = '1px solid #A7F3D0';
    badgeEl.style.cursor = 'pointer';
    badgeEl.title = `Assinado digitalmente em ${sig.signedAt || sig.dateOnly || 'Data registrada'}. Clique para ver a assinatura.`;
    badgeEl.innerHTML = `✅ Assinada em ${sig.dateOnly || sig.signedAt?.split(' ')[0] || 'OK'}`;
    badgeEl.onclick = () => openDigitalSignatureModal(emp.id, monthKey);
  } else {
    badgeEl.style.display = 'inline-flex';
    badgeEl.style.background = '#FEF3C7';
    badgeEl.style.color = '#92400E';
    badgeEl.style.border = '1px solid #FCD34D';
    badgeEl.style.cursor = 'pointer';
    badgeEl.title = 'Assinatura digital ainda pendente. Clique para solicitar via WhatsApp ou assinar agora.';
    badgeEl.innerHTML = `🟡 Assinatura Pendente`;
    badgeEl.onclick = () => openSendSignatureModal(emp.id);
  }
}

// Obtém o endereço base do sistema (com suporte a IP de rede Wi-Fi local para celular ou domínio online)
function getSignatureBaseUrl() {
  const custom = localStorage.getItem('lane_custom_sig_base_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
}

// Gera o link direto confidencial para o colaborador assinar a folha de ponto
function getSignatureLinkForEmployee(emp, monthKey) {
  const base = getSignatureBaseUrl();
  return `${base}/assinar.html?emp=${encodeURIComponent(emp.id)}&mes=${encodeURIComponent(monthKey)}`;
}

function handleSignatureBaseUrlChange(newUrl) {
  localStorage.setItem('lane_custom_sig_base_url', newUrl);
  updateSendSignatureMessage();
}

function resetSignatureBaseUrl() {
  localStorage.removeItem('lane_custom_sig_base_url');
  updateSendSignatureMessage();
}

function updateSendSignatureMessage() {
  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId) || getCurrentEmployee();
  if (!emp) return;

  const monthName = MONTH_NAMES[currentMonth - 1];
  const sigLink = getSignatureLinkForEmployee(emp, currentSigTargetMonthKey);
  const textareaEl = document.getElementById('sig-whatsapp-message-text');

  const defaultMsg = `Olá, *${emp.name}*! Tudo bem?
Segue o link oficial para você conferir e assinar digitalmente sua Folha de Ponto da empresa *LANE RO COMUNICAÇÕES LTDA*, referente ao mês de *${monthName} de ${currentYear}*.
🔗 Link para assinatura:
${sigLink}
📱 Acesse pelo celular e desenhe sua assinatura na tela.
Obrigado!`;

  if (textareaEl) textareaEl.value = defaultMsg;
}

// Abre o modal de envio de WhatsApp com mensagem pré-formatada e link
function openSendSignatureModal(targetEmpId = '') {
  const emp = targetEmpId ? (employeesDB.find(e => e.id === targetEmpId) || getCurrentEmployee()) : getCurrentEmployee();
  if (!emp) {
    alert('Selecione um colaborador primeiro.');
    return;
  }

  currentSigTargetEmpId = emp.id;
  currentSigTargetMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const monthName = MONTH_NAMES[currentMonth - 1];

  const nameEl = document.getElementById('sig-modal-emp-name');
  const cpfEl = document.getElementById('sig-modal-emp-cpf');
  const whatsEl = document.getElementById('sig-modal-emp-whatsapp');
  const badgeEl = document.getElementById('sig-modal-month-badge');
  const baseInputEl = document.getElementById('sig-custom-base-url');

  if (nameEl) nameEl.textContent = emp.name;
  if (cpfEl) cpfEl.textContent = emp.cpf;
  if (whatsEl) whatsEl.textContent = emp.whatsapp || 'Não informado';
  if (badgeEl) badgeEl.textContent = `${monthName}/${currentYear}`;
  if (baseInputEl) baseInputEl.value = getSignatureBaseUrl();

  updateSendSignatureMessage();

  const modal = document.getElementById('modal-send-signature-whatsapp');
  if (modal) modal.style.display = 'flex';
}

function closeSendSignatureModal() {
  const modal = document.getElementById('modal-send-signature-whatsapp');
  if (modal) modal.style.display = 'none';
}

// Copiar apenas o link de assinatura
function copySignatureLinkOnly() {
  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId) || getCurrentEmployee();
  if (!emp) return;
  const link = getSignatureLinkForEmployee(emp, currentSigTargetMonthKey);
  navigator.clipboard.writeText(link).then(() => {
    showToast('🔗 Link de assinatura copiado com sucesso!');
  }).catch(() => {
    prompt('Copie o link abaixo:', link);
  });
}

// Copiar mensagem completa formatada
function copySignatureCompleteMessage() {
  const textarea = document.getElementById('sig-whatsapp-message-text');
  if (!textarea) return;
  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast('📋 Mensagem completa copiada para a área de transferência!');
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
    showToast('📋 Mensagem copiada!');
  });
}

// Abrir WhatsApp Web ou App para envio direto
function openWhatsAppWebForSignature() {
  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId) || getCurrentEmployee();
  if (!emp) return;

  const rawPhone = (emp.whatsapp || '').replace(/\D/g, '');
  const textarea = document.getElementById('sig-whatsapp-message-text');
  const message = textarea ? textarea.value : '';

  if (!rawPhone || rawPhone.length < 10) {
    alert('⚠️ O colaborador não possui um número de WhatsApp válido cadastrado.');
    return;
  }

  // Formata com DDI 55 do Brasil se necessário
  const fullPhone = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone : `55${rawPhone}`;
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank');
  showToast(`🚀 Abrindo WhatsApp para enviar a folha de ${emp.name}...`);
}

// Testa a tela de assinatura diretamente no portal confidencial do colaborador
function testSignatureScreenDirectly() {
  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId) || getCurrentEmployee();
  if (!emp) return;
  const link = `assinar.html?emp=${encodeURIComponent(emp.id)}&mes=${encodeURIComponent(currentSigTargetMonthKey)}`;
  window.open(link, '_blank');
}

// Abre o Portal/Modal de Assinatura Digital
function openDigitalSignatureModal(empId = '', monthKey = '') {
  const targetId = empId || currentEmployeeId || employeesDB[0]?.id;
  const emp = employeesDB.find(e => e.id === targetId);
  if (!emp) return;

  currentSigTargetEmpId = emp.id;
  currentSigTargetMonthKey = monthKey || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const monthName = MONTH_NAMES[currentMonth - 1];

  const nameEl = document.getElementById('sig-pad-emp-name');
  const roleEl = document.getElementById('sig-pad-emp-role');
  const cpfEl = document.getElementById('sig-pad-emp-cpf');
  const periodEl = document.getElementById('sig-pad-period');
  const monthNameEl = document.getElementById('sig-pad-month-name');

  if (nameEl) nameEl.textContent = emp.name;
  if (roleEl) roleEl.textContent = emp.role;
  if (cpfEl) cpfEl.textContent = emp.cpf;
  if (periodEl) periodEl.textContent = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;
  if (monthNameEl) monthNameEl.textContent = `${monthName} de ${currentYear}`;

  const modal = document.getElementById('modal-digital-signature');
  if (modal) modal.style.display = 'flex';

  setTimeout(() => {
    initSignatureCanvas();
    clearSignatureCanvas();

    // Se já tinha assinatura salva, carrega na visualização
    const existingSig = (emp.signatures && emp.signatures[currentSigTargetMonthKey]) || emp.digitalSignature;
    if (existingSig) {
      loadExistingSignatureOnCanvas(existingSig.image || existingSig);
    }
  }, 100);
}

function closeDigitalSignatureModal() {
  const modal = document.getElementById('modal-digital-signature');
  if (modal) modal.style.display = 'none';

  // Se a URL estava com hash de assinatura, limpa suavemente
  if (window.location.hash && window.location.hash.includes('assinar')) {
    history.replaceState(null, null, ' ');
  }
}

// Inicializa os manipuladores do Canvas de Assinatura (Touch + Mouse)
function initSignatureCanvas() {
  const canvas = document.getElementById('signature-pad-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Ajuste de DPI de alta resolução
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (sigCanvasInitialized) return;
  sigCanvasInitialized = true;

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - r.left,
        y: e.touches[0].clientY - r.top
      };
    }
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    sigIsDrawing = true;
    const pos = getPos(e);
    sigLastX = pos.x;
    sigLastY = pos.y;

    const placeholder = document.getElementById('signature-pad-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';

    const statusEl = document.getElementById('sig-pad-status-text');
    if (statusEl) {
      statusEl.textContent = '✍️ Desenhando assinatura...';
      statusEl.style.color = '#059669';
    }
  }

  function draw(e) {
    if (!sigIsDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sigLastX, sigLastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    sigLastX = pos.x;
    sigLastY = pos.y;
    sigHasDrawn = true;
  }

  function stopDrawing(e) {
    if (!sigIsDrawing) return;
    sigIsDrawing = false;

    const statusEl = document.getElementById('sig-pad-status-text');
    if (statusEl && sigHasDrawn) {
      statusEl.textContent = '✅ Assinatura pronta para confirmação';
      statusEl.style.color = '#047857';
    }
  }

  // Eventos de Mouse
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  // Eventos de Touch (Celulares e Tablets)
  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
}

// Limpa o canvas de assinatura
function clearSignatureCanvas() {
  const canvas = document.getElementById('signature-pad-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  sigHasDrawn = false;

  const placeholder = document.getElementById('signature-pad-placeholder');
  if (placeholder) placeholder.style.opacity = '1';

  const statusEl = document.getElementById('sig-pad-status-text');
  if (statusEl) {
    statusEl.textContent = 'Aguardando traço';
    statusEl.style.color = '#D97706';
  }
}

// Carrega assinatura existente
function loadExistingSignatureOnCanvas(imgDataUrl) {
  const canvas = document.getElementById('signature-pad-canvas');
  if (!canvas || !imgDataUrl) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.drawImage(img, 20, 20, rect.width - 40, rect.height - 40);
    sigHasDrawn = true;
    const placeholder = document.getElementById('signature-pad-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';
    const statusEl = document.getElementById('sig-pad-status-text');
    if (statusEl) {
      statusEl.textContent = '✅ Assinatura já registrada (você pode redesenhar se desejar)';
      statusEl.style.color = '#047857';
    }
  };
  img.src = imgDataUrl;
}

// Confirma e Salva a Assinatura Digital
async function handleConfirmDigitalSignature() {
  if (!sigHasDrawn) {
    alert('⚠️ Por favor, desenhe sua assinatura no campo indicado antes de confirmar.');
    return;
  }

  const consentBox = document.getElementById('sig-pad-consent');
  if (consentBox && !consentBox.checked) {
    alert('⚠️ É necessário marcar a declaração de concordância para validar a assinatura.');
    return;
  }

  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId);
  if (!emp) return;

  const canvas = document.getElementById('signature-pad-canvas');
  const dataUrl = canvas.toDataURL('image/png');

  const now = new Date();
  const signatureObj = {
    image: dataUrl,
    signedAt: now.toLocaleString('pt-BR'),
    dateOnly: now.toLocaleDateString('pt-BR'),
    hash: 'LRO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    ipInfo: 'Assinado via WhatsApp / Mobile Interface'
  };

  if (!emp.signatures) emp.signatures = {};
  emp.signatures[currentSigTargetMonthKey] = signatureObj;
  emp.digitalSignature = signatureObj; // retrocompatibilidade

  // Salvar no LocalStorage
  saveEmployeesToLocalStorage();

  // Sincronizar com Supabase se conectado
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    window.supabaseService.saveFullTimesheet(emp.id, currentSigTargetMonthKey, emp.days).catch(err => {
      console.warn('Erro ao sincronizar assinatura com Supabase:', err);
    });
  }

  // Atualiza Hero e Tabela de visualização
  updateHeroSignatureBadge(emp);
  renderTimesheetTable();

  closeDigitalSignatureModal();
  showToast(`🎉 Folha de Ponto de ${emp.name} assinada digitalmente com sucesso!`);
}

// Apaga a Assinatura Digital do Colaborador e Salva
async function handleDeleteDigitalSignature() {
  const emp = employeesDB.find(e => e.id === currentSigTargetEmpId);
  if (!emp) return;

  const monthKey = currentSigTargetMonthKey || `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const existingSig = (emp.signatures && emp.signatures[monthKey]) || emp.digitalSignature;

  if (!existingSig && !sigHasDrawn) {
    clearSignatureCanvas();
    closeDigitalSignatureModal();
    return;
  }

  if (!confirm(`Deseja realmente apagar a assinatura digital de ${emp.name} referente a este período? A folha voltará ao status pendente.`)) {
    return;
  }

  // Remove assinatura do mês e legado
  if (emp.signatures && emp.signatures[monthKey]) {
    delete emp.signatures[monthKey];
  }
  delete emp.digitalSignature;

  // Salvar no LocalStorage
  saveEmployeesToLocalStorage();

  // Sincronizar com Supabase se conectado
  if (window.supabaseService && window.supabaseService.isConfigured()) {
    window.supabaseService.saveFullTimesheet(emp.id, monthKey, emp.days).catch(err => {
      console.warn('Erro ao sincronizar remoção de assinatura com Supabase:', err);
    });
  }

  // Atualiza Hero e Tabela
  clearSignatureCanvas();
  updateHeroSignatureBadge(emp);
  renderTimesheetTable();

  closeDigitalSignatureModal();
  showToast(`🗑️ Assinatura digital de ${emp.name} apagada e salva com sucesso!`);
}

// Verifica se a página foi aberta com parâmetros de assinatura na URL (#assinar?emp=...&mes=...)
function checkUrlHashForSignature() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('assinar')) return;

  try {
    const queryString = hash.split('?')[1];
    if (!queryString) return;

    const params = new URLSearchParams(queryString);
    const empId = params.get('emp');
    const mesParam = params.get('mes');

    if (empId) {
      const emp = employeesDB.find(e => e.id === empId || (e.cpf && e.cpf.replace(/\D/g, '') === empId.replace(/\D/g, '')));
      if (emp) {
        selectEmployee(emp.id, false);
        if (mesParam && mesParam.includes('-')) {
          const [y, m] = mesParam.split('-');
          currentYear = parseInt(y, 10) || currentYear;
          currentMonth = parseInt(m, 10) || currentMonth;
          updateMonthDisplay();
        }
        setTimeout(() => {
          openDigitalSignatureModal(emp.id, mesParam || `${currentYear}-${String(currentMonth).padStart(2, '0')}`);
        }, 300);
      }
    }
  } catch (e) {
    console.warn('Erro ao processar hash de assinatura:', e);
  }
}

/* ========================================================================== */
/* MÓDULO DE ASSINATURA DIGITAL DO EMPREGADOR / GESTOR (EMPRESA)             */
/* ========================================================================== */

let companySettingSigInitialized = false;
let companySettingSigHasDrawn = false;
let companySettingSigIsDrawing = false;
let companySettingSigLastX = 0;
let companySettingSigLastY = 0;

let companyDirectSigInitialized = false;
let companyDirectSigHasDrawn = false;
let companyDirectSigIsDrawing = false;
let companyDirectSigLastX = 0;
let companyDirectSigLastY = 0;

// Inicializa o canvas de assinatura da empresa na aba de Configurações
function initCompanySettingSigCanvas() {
  const canvas = document.getElementById('company-setting-sig-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (companySettingSigInitialized) return;
  companySettingSigInitialized = true;

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startDrawing(e) {
    e.preventDefault();
    companySettingSigIsDrawing = true;
    const pos = getPos(e);
    companySettingSigLastX = pos.x;
    companySettingSigLastY = pos.y;
    const placeholder = document.getElementById('company-setting-sig-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';
  }

  function draw(e) {
    if (!companySettingSigIsDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(companySettingSigLastX, companySettingSigLastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    companySettingSigLastX = pos.x;
    companySettingSigLastY = pos.y;
    companySettingSigHasDrawn = true;
  }

  function stopDrawing() {
    companySettingSigIsDrawing = false;
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
}

function clearCompanySettingSignatureCanvas() {
  const canvas = document.getElementById('company-setting-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  companySettingSigHasDrawn = false;
  systemSettings.companySignature = null;
  const placeholder = document.getElementById('company-setting-sig-placeholder');
  if (placeholder) placeholder.style.opacity = '1';
}

function loadExistingCompanySigOnSettingCanvas(imgDataUrl) {
  const canvas = document.getElementById('company-setting-sig-canvas');
  if (!canvas || !imgDataUrl) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.drawImage(img, 15, 15, rect.width - 30, rect.height - 30);
    companySettingSigHasDrawn = true;
    const placeholder = document.getElementById('company-setting-sig-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';
  };
  img.src = imgDataUrl;
}

// Modal Direto de Assinatura do Empregador (acessado na tela de Folha de Ponto)
function openCompanySignatureModal() {
  const monthName = MONTH_NAMES[currentMonth - 1];
  const monthBadge = document.getElementById('company-sig-modal-month');
  if (monthBadge) monthBadge.textContent = `${monthName}/${currentYear}`;

  const modal = document.getElementById('modal-company-signature');
  if (modal) modal.style.display = 'flex';

  setTimeout(() => {
    initCompanyDirectSigCanvas();
    clearCompanyDirectSignatureCanvas();

    if (systemSettings.companySignature) {
      loadExistingCompanySigOnDirectCanvas(systemSettings.companySignature.image || systemSettings.companySignature);
    }
  }, 100);
}

function closeCompanySignatureModal() {
  const modal = document.getElementById('modal-company-signature');
  if (modal) modal.style.display = 'none';
}

function initCompanyDirectSigCanvas() {
  const canvas = document.getElementById('company-direct-sig-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (companyDirectSigInitialized) return;
  companyDirectSigInitialized = true;

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    }
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startDrawing(e) {
    e.preventDefault();
    companyDirectSigIsDrawing = true;
    const pos = getPos(e);
    companyDirectSigLastX = pos.x;
    companyDirectSigLastY = pos.y;
    const placeholder = document.getElementById('company-direct-sig-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';
  }

  function draw(e) {
    if (!companyDirectSigIsDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(companyDirectSigLastX, companyDirectSigLastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    companyDirectSigLastX = pos.x;
    companyDirectSigLastY = pos.y;
    companyDirectSigHasDrawn = true;
  }

  function stopDrawing() {
    companyDirectSigIsDrawing = false;
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
}

function clearCompanyDirectSignatureCanvas() {
  const canvas = document.getElementById('company-direct-sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  companyDirectSigHasDrawn = false;
  const placeholder = document.getElementById('company-direct-sig-placeholder');
  if (placeholder) placeholder.style.opacity = '1';
}

function loadExistingCompanySigOnDirectCanvas(imgDataUrl) {
  const canvas = document.getElementById('company-direct-sig-canvas');
  if (!canvas || !imgDataUrl) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.drawImage(img, 15, 15, rect.width - 30, rect.height - 30);
    companyDirectSigHasDrawn = true;
    const placeholder = document.getElementById('company-direct-sig-placeholder');
    if (placeholder) placeholder.style.opacity = '0.05';
  };
  img.src = imgDataUrl;
}

function handleConfirmCompanySignature() {
  if (!companyDirectSigHasDrawn) {
    alert('⚠️ Por favor, desenhe a assinatura do gestor antes de confirmar.');
    return;
  }

  const canvas = document.getElementById('company-direct-sig-canvas');
  const dataUrl = canvas.toDataURL('image/png');
  const now = new Date();
  const managerName = systemSettings.managerName || 'Roberto Silva (Admin)';

  const companySigObj = {
    image: dataUrl,
    signedAt: now.toLocaleString('pt-BR'),
    dateOnly: now.toLocaleDateString('pt-BR'),
    managerName: managerName,
    hash: 'LANE-EMPR-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  };

  const applyAll = document.getElementById('company-sig-apply-all-checkbox')?.checked !== false;

  // Salva no systemSettings
  systemSettings.companySignature = companySigObj;
  systemSettings.autoApplyCompanySig = applyAll;
  localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));

  // Salva também na folha do colaborador atual
  const emp = getCurrentEmployee();
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (emp) {
    if (!emp.signatures) emp.signatures = {};
    if (!emp.signatures[monthKey]) emp.signatures[monthKey] = {};
    emp.signatures[monthKey].companySignature = companySigObj;
    saveEmployeesToLocalStorage();
  }

  closeCompanySignatureModal();
  showToast('✅ Assinatura Digital do Empregador (LANE RO COMUNICAÇÕES LTDA) gravada com sucesso!');
}

// Apaga a Assinatura Digital da Empresa/Empregador e Salva
function handleDeleteCompanySignature() {
  if (!confirm('Deseja realmente apagar a assinatura digital da empresa cadastrada?')) {
    return;
  }

  // Remove dos settings globais
  systemSettings.companySignature = null;
  localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(systemSettings));

  // Remove também da folha do colaborador atual se existir
  const emp = getCurrentEmployee();
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  if (emp && emp.signatures && emp.signatures[monthKey] && emp.signatures[monthKey].companySignature) {
    delete emp.signatures[monthKey].companySignature;
    saveEmployeesToLocalStorage();
  }

  clearCompanyDirectSignatureCanvas();
  closeCompanySignatureModal();
  showToast('🗑️ Assinatura digital da empresa apagada e salva com sucesso!');
}

