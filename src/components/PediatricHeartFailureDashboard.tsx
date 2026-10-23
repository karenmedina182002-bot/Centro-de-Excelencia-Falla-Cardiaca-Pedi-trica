import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Baby,
  CalendarDays,
  Clock3,
  Heart,
  HeartPulse,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { PediatricHeartFailureRecord } from '../data/pediatricHeartFailurePatients';

interface Props {
  pacientes: PediatricHeartFailureRecord[];
}

type ChartDatum = { label: string; count: number; color?: string };
type ConsultOutcome = 'Pendiente' | 'Asistió' | 'No asistió';
interface ConsultUpdate { outcome: ConsultOutcome; observation: string }
type ConsultUpdates = Record<string, ConsultUpdate>;
interface FollowUpDetail { responsable: string; observacion: string }
type FollowUpDetails = Record<string, FollowUpDetail>;
type AppointmentAlert = { kind: 'overdue' | 'confirm' | 'none' | 'missing'; label: string };

const CONSULT_UPDATES_STORAGE_KEY = 'fcv-pediatric-heart-failure-consult-updates';
const FOLLOW_UP_DETAILS_STORAGE_KEY = 'fcv-pediatric-heart-failure-follow-up-details';

const readConsultUpdates = (): ConsultUpdates => {
  try {
    const stored = localStorage.getItem(CONSULT_UPDATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) as ConsultUpdates : {};
  } catch {
    return {};
  }
};

const readFollowUpDetails = (): FollowUpDetails => {
  try {
    const stored = localStorage.getItem(FOLLOW_UP_DETAILS_STORAGE_KEY);
    return stored ? JSON.parse(stored) as FollowUpDetails : {};
  } catch {
    return {};
  }
};

const DEMO_FOLLOW_UP_STAFF = [
  'Dra. Ana Lucía Rojas',
  'Enf. Mariana Pardo',
  'Dra. Camila Torres',
  'Enf. Natalia Gómez',
  'Dr. Santiago Herrera',
  'Enf. Paula Cárdenas',
];

const getDemoClinicalProfile = (patient: PediatricHeartFailureRecord) => {
  const patientNumber = Number(patient.idFicticio.split('-').pop()) || 1;
  const age = Math.max(1, Number(patient.edad) || 1);
  const heightCm = Math.round(76 + (age - 1) * 5.3 + (patientNumber % 5) * 1.2);
  const bmi = Number((15.5 + (patientNumber % 31) / 10).toFixed(1));
  const weightKg = Number((bmi * (heightCm / 100) ** 2).toFixed(1));
  const bloodGroups = ['O+', 'A+', 'B+', 'O−', 'AB+', 'A−'];
  const antecedents = [
    'Sin comorbilidades adicionales en este registro de demostración.',
    'Antecedente ficticio de infección respiratoria recurrente.',
    'Antecedente ficticio de hospitalización pediátrica previa.',
    'Antecedente ficticio de seguimiento por arritmia.',
    'Antecedente ficticio de alergia estacional reportada.',
  ];
  const demoPlans = ['Plan pediátrico básico · simulado', 'Plan familiar de atención · simulado', 'Plan integral infantil · simulado'];
  const demoHouseholds = ['Madre, padre y hermanos · simulado', 'Madre y abuelos · simulado', 'Padre y hermanos · simulado', 'Madre y padre · simulado'];
  const demoGuardians = [
    { name: 'Laura Rodríguez Castro', relationship: 'madre' },
    { name: 'Diana López Rincón', relationship: 'madre' },
    { name: 'Andrés Díaz Moreno', relationship: 'padre' },
    { name: 'Martha Romero Gil', relationship: 'abuela' },
    { name: 'Carolina Moreno Pérez', relationship: 'tía' },
    { name: 'Jorge Ramírez Torres', relationship: 'padre' },
  ];
  const demoSchooling = age < 3
    ? 'Educación inicial · simulado'
    : age < 6
      ? 'Preescolar · simulado'
      : age < 12
        ? 'Básica primaria · simulado'
        : 'Básica secundaria · simulado';
  return {
    documentType: age < 7 ? 'RC' : 'TI',
    documentNumber: `000000${String(patientNumber).padStart(4, '0')}`,
    heightCm,
    weightKg,
    bmi,
    nutritionStatus: ['Adecuado para la edad', 'Riesgo de bajo peso', 'Riesgo de exceso de peso'][patientNumber % 3],
    bloodGroup: bloodGroups[patientNumber % bloodGroups.length],
    antecedent: antecedents[patientNumber % antecedents.length],
    plan: demoPlans[patientNumber % demoPlans.length],
    affiliation: patientNumber % 3 === 0 ? 'Beneficiario · simulado' : 'Cotizante · simulado',
    address: `Calle ${10 + patientNumber} # ${20 + patientNumber}-15 · dirección ficticia`,
    household: demoHouseholds[patientNumber % demoHouseholds.length],
    guardian: `${demoGuardians[patientNumber % demoGuardians.length].name} (${demoGuardians[patientNumber % demoGuardians.length].relationship}) · simulado`,
    mobile: `300 000 ${String(patientNumber).padStart(4, '0')} · simulado`,
    homePhone: `000 000 ${String(patientNumber + 1000).padStart(4, '0')} · simulado`,
    email: `paciente.demo.${String(patientNumber).padStart(3, '0')}@example.invalid · simulado`,
    civilStatus: 'No aplica por edad · simulado',
    schooling: demoSchooling,
    occupation: age < 5 ? 'Primera infancia · simulado' : 'Estudiante · simulado',
    ethnicityReligion: 'No especificado · simulado',
  };
};

const createDemoFollowUpDetail = (patient: PediatricHeartFailureRecord, item: { key: string; status: string }): FollowUpDetail => {
  const appointmentNotAttended = item.key === 'proxima-consulta' && /no\s+asisti[oó]|no\s+acudi[oó]|inasisten/i.test(patient.observaciones || '');
  const notPerformed = item.status === 'Pendiente' || appointmentNotAttended;
  if (notPerformed) {
    return {
      responsable: 'No aplica · seguimiento no realizado',
      observacion: `Simulación: ${appointmentNotAttended ? 'la consulta figura como no asistida en el registro' : 'el seguimiento permanece pendiente'}; esta fecha no representa una atención realizada.`,
    };
  }

  const seed = `${patient.idFicticio}:${item.key}`.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const notes = item.key === 'ingreso'
    ? [
        'Simulación: se registra el ingreso al programa y se explica al cuidador la ruta de seguimiento.',
        'Simulación: se orienta a la familia sobre el proceso de atención y los próximos controles.',
      ]
    : item.key === 'ultimo-control'
      ? [
          'Simulación: se deja constancia del control y se revisan las indicaciones generales con el cuidador.',
          'Simulación: se registra la asistencia al control y se aclaran dudas sobre el seguimiento.',
        ]
      : [
          'Simulación: se realiza seguimiento general con el cuidador y se documentan las inquietudes reportadas.',
          'Simulación: se contacta a la familia para revisar el proceso de seguimiento y registrar novedades.',
        ];

  return {
    responsable: DEMO_FOLLOW_UP_STAFF[seed % DEMO_FOLLOW_UP_STAFF.length],
    observacion: notes[seed % notes.length],
  };
};

const COLORS = ['#f9a8d4', '#93c5fd', '#fda4af', '#67e8f9', '#6ee7b7', '#fcd34d', '#fdba74'];
const DOCUMENT_TYPE_BADGE_CLASSES: Record<string, string> = {
  TI: 'border-blue-200 bg-blue-50 text-blue-700',
  RC: 'border-pink-200 bg-pink-50 text-pink-700',
  NV: 'border-amber-200 bg-amber-50 text-amber-700',
};
const STATUS_COLORS: Record<string, string> = {
  Pendiente: '#fcd34d',
  Realizado: '#6ee7b7',
  'No aplica': '#cbd5e1',
  'Sin dato': '#e2e8f0',
};

const countBy = (values: Array<string | null | undefined>): ChartDatum[] => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const label = value?.trim() || 'Sin dato';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
};

const dateTimestamp = (value: string) => {
  if (!value) return null;
  const timestamp = Date.parse(value.slice(0, 10) + 'T00:00:00Z');
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getAppointmentAlert = (patient: PediatricHeartFailureRecord, savedUpdate: ConsultUpdate | undefined, todayUtc: number): AppointmentAlert => {
  const timestamp = dateTimestamp(patient.proximaConsulta);
  if (timestamp === null) return { kind: 'missing', label: 'Sin fecha' };
  const daysLate = Math.floor((todayUtc - timestamp) / 86400000);
  if (daysLate < 0) return { kind: 'none', label: 'Al día' };

  const recordedNoShow = savedUpdate
    ? savedUpdate.outcome === 'No asistió'
    : /no\s+asisti[oó]|no\s+acudi[oó]|inasisten/i.test(patient.observaciones || '');
  if (!recordedNoShow) return { kind: 'confirm', label: 'Asistencia por confirmar' };

  const overdueMonths = Math.floor(daysLate / 30);
  const overdue = overdueMonths > 0
    ? `Atrasado ${overdueMonths} ${overdueMonths === 1 ? 'mes' : 'meses'}`
    : `Atrasado ${Math.max(1, daysLate)} ${daysLate === 1 ? 'día' : 'días'}`;
  return { kind: 'overdue', label: `Consulta vencida · ${overdue}` };
};

const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
const followUpLabel = (status: string, date: string) => `${status || 'Sin dato'}${date ? ` · ${date}` : ''}`;

export const PediatricHeartFailureDashboard: React.FC<Props> = ({ pacientes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedEps, setSelectedEps] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PediatricHeartFailureRecord | null>(null);
  const [consultUpdates, setConsultUpdates] = useState<ConsultUpdates>(readConsultUpdates);

  const total = pacientes.length;
  const activeCount = pacientes.filter((patient) => patient.estadoCentro === 'Activo').length;
  const inactiveCount = total - activeCount;
  const pendingThreeMonth = pacientes.filter((patient) => patient.seguimiento3Estado === 'Pendiente').length;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const activeConsultAlertCount = pacientes.filter((patient) => getAppointmentAlert(patient, consultUpdates[patient.idFicticio], todayUtc).kind === 'overdue').length;

  const ageData = useMemo(() => {
    const groups = [
      { label: '0–4', count: 0 },
      { label: '5–9', count: 0 },
      { label: '10–14', count: 0 },
      { label: '15–18', count: 0 },
      { label: 'Sin dato', count: 0 },
    ];
    pacientes.forEach((patient) => {
      const age = Number(patient.edad);
      const index = !Number.isFinite(age) || age < 0 ? 4 : age <= 4 ? 0 : age <= 9 ? 1 : age <= 14 ? 2 : age <= 18 ? 3 : 4;
      groups[index].count += 1;
    });
    return groups;
  }, [pacientes]);

  const sexData = useMemo(() => countBy(pacientes.map((patient) => patient.sexo)), [pacientes]);
  const zoneData = useMemo(() => countBy(pacientes.map((patient) => patient.zona)), [pacientes]);
  const regimenData = useMemo(() => countBy(pacientes.map((patient) => patient.regimen)), [pacientes]);
  const etiologyData = useMemo(() => countBy(pacientes.map((patient) => patient.etiologia)), [pacientes]);
  const epsData = useMemo(() => countBy(pacientes.map((patient) => patient.eps)), [pacientes]);

  const nutritionData = useMemo(() => countBy(
    pacientes.map((patient) => getDemoClinicalProfile(patient).nutritionStatus),
  ), [pacientes]);

  const nursingData = useMemo(() => [
    { label: '3 meses', status: countBy(pacientes.map((patient) => patient.seguimiento3Estado)) },
    { label: '6 meses', status: countBy(pacientes.map((patient) => patient.seguimiento6Estado)) },
    { label: '12 meses', status: countBy(pacientes.map((patient) => patient.seguimiento12Estado)) },
  ], [pacientes]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es');
    return pacientes.filter((patient) => {
      if (onlyActive && patient.estadoCentro !== 'Activo') return false;
      if (selectedEps && patient.eps !== selectedEps) return false;
      if (!query) return true;
      return [patient.paciente, patient.etiologia, patient.eps, patient.ciudad]
        .some((value) => value.toLocaleLowerCase('es').includes(query));
    });
  }, [pacientes, onlyActive, searchTerm, selectedEps]);

  const updateConsult = (patient: PediatricHeartFailureRecord, update: ConsultUpdate) => {
    setConsultUpdates((current) => {
      const next = { ...current, [patient.idFicticio]: update };
      try {
        localStorage.setItem(CONSULT_UPDATES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // La ficha sigue funcionando aunque el navegador bloquee el almacenamiento local.
      }
      return next;
    });
  };

  return (
    <div className="page-enter space-y-5 animate-in fade-in duration-200">
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores y gráficos del centro">
        <article className="relative flex min-h-[248px] flex-col justify-between overflow-hidden rounded-[22px] bg-gradient-to-br from-pink-200 via-rose-200 to-pink-100 p-5 text-pink-950 shadow-[0_10px_24px_rgba(167,139,250,0.16)]">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/30" />
          <Heart className="pointer-events-none absolute right-20 top-12 h-7 w-7 rotate-12 fill-pink-300/60 text-pink-300/60" />
          <Sparkles className="pointer-events-none absolute bottom-16 right-8 h-5 w-5 text-amber-400/80" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-pink-900"><Baby className="h-5 w-5" /> Pacientes pediátricos</div>
              <div className="rounded-xl bg-white/40 p-3 text-pink-700"><HeartPulse className="h-5 w-5" /></div>
            </div>
            <div className="mt-2 text-6xl font-bold leading-none tracking-tight tabular-nums text-pink-950">{activeCount}</div>
            <p className="mt-2 text-sm text-pink-800">niñas y niños activos en el centro</p>
          </div>
          <div className="relative flex items-center justify-between gap-3 border-t border-pink-300/60 pt-3 text-xs text-pink-900">
            <span className="inline-flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-400" />{activeCount} activos · {percent(activeCount, total)}%</span>
            <span className="inline-flex items-center gap-1.5 font-medium"><span className="h-2 w-2 rounded-full bg-amber-400" />{inactiveCount} no activos · {percent(inactiveCount, total)}%</span>
            <span className="shrink-0 text-pink-700">{total} pacientes</span>
          </div>
        </article>

        <ChartPanel title="Sexo" meta={`Total: ${total}`}>
          <DonutSummary data={sexData} total={total} centerLabel="PACIENTES" />
        </ChartPanel>
        <ChartPanel title="Zona de residencia" meta="Geografía">
          <DonutSummary data={zoneData} total={total} centerLabel="REGISTROS" />
        </ChartPanel>
        <ChartPanel title="Régimen de afiliación" meta="Seguridad social">
          <DonutSummary data={regimenData} total={total} centerLabel="REGÍMENES" />
        </ChartPanel>

        <ChartPanel title="Estado nutricional" meta="Clasificación simulada">
          <DonutSummary data={nutritionData} total={total} centerLabel="PACIENTES" />
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">Distribución basada en datos ficticios de demostración.</p>
        </ChartPanel>
        <ChartPanel title="Distribución por grupo etario" meta="Años">
          <VerticalBars data={ageData} total={total} />
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
            <span>Edad consignada en el Excel</span><span className="font-mono text-slate-500">{total} registros</span>
          </div>
        </ChartPanel>
        <ChartPanel title="Etiologías registradas" meta="Diagnóstico consignado">
          <HorizontalBars data={etiologyData} compact total={total} />
        </ChartPanel>
        <ChartPanel title="Distribución por EPS" meta={selectedEps ? 'Clic para quitar filtro' : 'Clic para filtrar'}>
          <RankedList data={epsData} total={total} selected={selectedEps} onSelect={(value) => setSelectedEps((current) => current === value ? null : value)} />
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
            <span>Aseguradoras registradas</span><span className="font-mono">{selectedEps || 'Todas'}</span>
          </div>
        </ChartPanel>
      </section>

      <section className="rounded-[20px] border border-white bg-white p-4 shadow-[0_2px_7px_rgba(15,23,42,0.07)] md:p-5" aria-label="Seguimiento de enfermería">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700"><Baby className="h-4 w-4 text-pink-400" /> Seguimiento de enfermería</h2>
            <p className="mt-1 text-xs text-slate-400">Estados y fechas consignados en el archivo</p>
          </div>
          <span className="text-[11px] text-slate-400">Verificar con el equipo antes de uso asistencial</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3 md:gap-7">
          {nursingData.map((period) => (
            <div key={period.label}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{period.label}</span>
                <span className="tabular-nums text-slate-400">{total} registros</span>
              </div>
              <StackedStatusBar data={period.status} total={total} />
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {period.status.map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS[item.label] || '#c4b5fd' }} />
                    {item.label} <strong className="font-semibold text-slate-700">{item.count}</strong> <span>{percent(item.count, total)}%</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">La ficha de empalme indica que estos estados de seguimiento son de muestra y deben validarse.</p>
      </section>

      <section className="overflow-hidden rounded-[20px] border border-white bg-white shadow-[0_2px_7px_rgba(15,23,42,0.07)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-3 text-xs md:px-5">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Alertas</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${activeConsultAlertCount ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <span className={`h-2 w-2 rounded-full ${activeConsultAlertCount ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {activeConsultAlertCount} con alerta
          </span>
          <span className="ml-auto text-[10px] text-slate-400">Consultas vencidas registradas como inasistencia</span>
        </div>
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-4 lg:flex-row lg:items-center md:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-pink-50 p-2.5 text-pink-600"><Users className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Pacientes pediátricos</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">{filteredPatients.length} de {total}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Listado de seguimiento ambulatorio · selecciona un registro para ver el detalle</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
              Solo activos
              <input type="checkbox" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} className="peer sr-only" />
              <span className={`relative h-5 w-9 rounded-full transition-colors ${onlyActive ? 'bg-pink-400' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${onlyActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
            </label>
            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar paciente, EPS…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs md:px-5">
          <span className="font-semibold uppercase tracking-wide text-slate-400">Seguimiento 3m pendiente</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">{pendingThreeMonth} registros</span>
          <span className="ml-auto text-[10px] text-slate-400">Dato del archivo; no corresponde a alertas clínicas automáticas</span>
        </div>

        <div className="custom-scrollbar max-h-[520px] overflow-auto overscroll-contain">
          <table className="w-full min-w-[1660px] text-left text-xs">
            <thead className="sticky top-0 z-20 bg-[#fbfbfd] text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                {['Tipo documento', 'N.º documento', 'Paciente', 'Alertas', 'Estado', 'Edad', 'Sexo', 'Peso', 'Talla', 'IMC', 'Estado nutricional', 'Antecedentes', 'Etiología', 'Último control', 'Próxima consulta', 'EPS'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => {
                const appointmentAlert = getAppointmentAlert(patient, consultUpdates[patient.idFicticio], todayUtc);
                const demoProfile = getDemoClinicalProfile(patient);
                return <tr key={patient.idFicticio} onClick={() => setSelectedPatient(patient)} className={`group cursor-pointer transition-colors ${appointmentAlert.kind === 'overdue' ? 'bg-amber-50/60 hover:bg-amber-100/70' : 'hover:bg-pink-50/40'}`}>
                  <td className="whitespace-nowrap px-4 py-2.5" title="Tipo de documento ficticio de demostración"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${DOCUMENT_TYPE_BADGE_CLASSES[demoProfile.documentType] || 'border-amber-200 bg-amber-50 text-amber-700'}`}>{demoProfile.documentType}</span><span className="ml-1 text-[10px] text-slate-400">simulado</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-600" title="Número de documento ficticio, no válido">{demoProfile.documentNumber} <span className="font-sans text-[10px] text-slate-400">simulado</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <button onClick={() => setSelectedPatient(patient)} className="text-left font-medium text-slate-800 hover:text-pink-700">{patient.paciente}</button>
                  </td>
                  <td className="px-4 py-2.5">
                    {appointmentAlert.kind === 'overdue' ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{appointmentAlert.label}</span>
                      : appointmentAlert.kind === 'confirm' ? <span className="text-[10px] font-medium text-slate-500">{appointmentAlert.label}</span>
                        : <span className="text-[10px] text-slate-400">{appointmentAlert.label}</span>}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill value={patient.estadoCentro} /></td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">{patient.edad} años</td>
                  <td className="px-4 py-2.5 text-slate-600">{patient.sexo}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600" title="Dato ficticio de demostración">{demoProfile.weightKg} <span className="text-[10px] text-slate-400">kg · simulado</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600" title="Dato ficticio de demostración">{demoProfile.heightCm} <span className="text-[10px] text-slate-400">cm · simulado</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums text-slate-600" title="Dato ficticio de demostración">{demoProfile.bmi} <span className="font-sans text-[10px] text-slate-400">simulado</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5" title="Clasificación ficticia de demostración"><span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">{demoProfile.nutritionStatus}</span><span className="ml-1 text-[10px] text-slate-400">simulado</span></td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-slate-600" title={`${demoProfile.antecedent} · Dato ficticio de demostración`}>{demoProfile.antecedent} <span className="text-[10px] text-slate-400">· simulado</span></td>
                  <td className="max-w-[190px] truncate px-4 py-2.5 text-slate-600" title={patient.etiologia}>{patient.etiologia}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">{patient.ultimoControl || 'Sin dato'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">{patient.proximaConsulta || 'Sin dato'}</td>
                  <td className="px-4 py-2.5 text-slate-600">{patient.eps}</td>
                </tr>;
              })}
              {filteredPatients.length === 0 && <tr><td colSpan={16} className="px-4 py-12 text-center text-sm text-slate-400">No hay registros que coincidan con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPatient && createPortal(<PatientRecordModal patient={selectedPatient} consultUpdate={consultUpdates[selectedPatient.idFicticio]} onUpdateConsult={(update) => updateConsult(selectedPatient, update)} onClose={() => setSelectedPatient(null)} />, document.body)}
    </div>
  );
};

const ChartPanel: React.FC<{ title: string; meta: string; children: React.ReactNode }> = ({ title, meta, children }) => (
  <article className="flex min-h-[248px] min-w-0 flex-col rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[0_2px_7px_rgba(15,23,42,0.07)] md:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="truncate text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h3>
      <span className="shrink-0 truncate text-[10px] font-mono text-slate-400">{meta}</span>
    </div>
    <div className="flex min-h-0 flex-1 flex-col">{children}</div>
  </article>
);

const DonutSummary: React.FC<{ data: ChartDatum[]; total: number; centerLabel: string }> = ({ data, total, centerLabel }) => (
  <div className="flex flex-1 items-center justify-center gap-3 sm:gap-4">
    <DonutChart data={data} total={total} centerLabel={centerLabel} />
    <div className="min-w-0 flex-1 space-y-2.5">
      {data.map((item, index) => (
        <div key={item.label} className="flex min-w-0 items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }} />
          <span className="min-w-0 flex-1 truncate text-slate-600" title={item.label}>{item.label}</span>
          <strong className="tabular-nums text-slate-800">{item.count}</strong>
          <span className="w-8 text-right font-mono text-[10px] text-slate-400">{percent(item.count, total)}%</span>
        </div>
      ))}
    </div>
  </div>
);

const DonutChart: React.FC<{ data: ChartDatum[]; total: number; centerLabel: string }> = ({ data, total, centerLabel }) => {
  let offset = 0;
  const stops = data.map((item, index) => {
    const start = offset;
    offset += total ? (item.count / total) * 100 : 0;
    const color = item.color || COLORS[index % COLORS.length];
    return `${color} ${start}% ${offset}%`;
  });
  return (
    <div className="relative h-[126px] w-[126px] shrink-0 rounded-full sm:h-[136px] sm:w-[136px]" style={{ background: total ? `conic-gradient(${stops.join(', ')})` : '#e2e8f0' }} role="img" aria-label={`${centerLabel}: ${data.map((item) => `${item.label} ${item.count}`).join(', ')}`}>
      <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full bg-white text-center">
        <span className="text-2xl font-bold leading-none tabular-nums text-slate-800">{total}</span>
        <span className="mt-1 max-w-[74px] text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
};

const VerticalBars: React.FC<{ data: ChartDatum[]; total: number }> = ({ data, total }) => {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div className="flex min-h-[174px] flex-1 items-end justify-around gap-2 pt-4">
      {data.map((item, index) => (
        <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold tabular-nums text-slate-500">{item.count} · {percent(item.count, total)}%</span>
          <div className="flex h-[112px] w-full items-end overflow-hidden rounded-t-lg bg-slate-100">
            <div className="w-full rounded-t-xl transition-[height]" style={{ height: `${item.count ? Math.max(6, (item.count / max) * 100) : 0}%`, backgroundColor: COLORS[index % COLORS.length], opacity: index === 0 ? 0.8 : 1 }} />
          </div>
          <span className="whitespace-nowrap text-[9px] text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const HorizontalBars: React.FC<{ data: ChartDatum[]; compact?: boolean; total: number }> = ({ data, compact = false, total }) => {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div className={`custom-scrollbar min-h-0 space-y-2 overflow-y-auto pr-1 ${compact ? 'max-h-[190px]' : ''}`}>
      {data.map((item, index) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_1.5rem] gap-x-2 gap-y-1">
          <div className="truncate text-[10px] text-slate-600" title={item.label}>{item.label}</div>
        <div className="text-right text-[10px] font-semibold tabular-nums text-slate-700">{item.count} · {percent(item.count, total)}%</div>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${item.count ? Math.max(4, (item.count / max) * 100) : 0}%`, backgroundColor: COLORS[index % COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const RankedList: React.FC<{ data: ChartDatum[]; total: number; selected: string | null; onSelect: (value: string) => void }> = ({ data, total, selected, onSelect }) => {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {data.map((item, index) => (
        <button key={item.label} onClick={() => onSelect(item.label)} aria-pressed={selected === item.label} className={`w-full rounded-lg px-1.5 py-1 text-left transition-colors ${selected === item.label ? 'bg-pink-50' : 'hover:bg-slate-50'}`}>
          <div className="mb-1 flex items-center gap-2 text-[10px]">
            <span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span>
            <strong className="tabular-nums text-slate-800">{item.count}</strong>
            <span className="w-8 text-right font-mono text-slate-400">{percent(item.count, total)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div>
        </button>
      ))}
    </div>
  );
};

const StackedStatusBar: React.FC<{ data: ChartDatum[]; total: number }> = ({ data, total }) => (
  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={data.map((item) => `${item.label}: ${item.count}`).join(', ')}>
    {data.map((item) => <span key={item.label} title={`${item.label}: ${item.count}`} style={{ width: `${total ? (item.count / total) * 100 : 0}%`, backgroundColor: STATUS_COLORS[item.label] || '#c4b5fd' }} />)}
  </div>
);

const StatusPill: React.FC<{ value: string }> = ({ value }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${value === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{value}</span>
);

const FollowUpPill: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${status === 'Realizado' ? 'bg-emerald-50 text-emerald-700' : status === 'Pendiente' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{status || 'Sin dato'}</span>
);

type PatientTab = 'perfil' | 'trayectoria' | 'sociodemografico';

const PatientRecordModal: React.FC<{ patient: PediatricHeartFailureRecord; consultUpdate?: ConsultUpdate; onUpdateConsult: (update: ConsultUpdate) => void; onClose: () => void }> = ({ patient, consultUpdate, onUpdateConsult, onClose }) => {
  const [activeTab, setActiveTab] = useState<PatientTab>('perfil');
  const [followUpDetails, setFollowUpDetails] = useState<FollowUpDetails>(readFollowUpDetails);
  const [openTimelineKey, setOpenTimelineKey] = useState<string | null>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const initials = patient.paciente.split(' ').map((name) => name[0]).slice(0, 2).join('');
  const missing = 'No registrado en el Excel';
  const demoProfile = getDemoClinicalProfile(patient);
  const hasMissedConsultNote = /no\s+asisti[oó]|no\s+acudi[oó]|inasisten/i.test(patient.observaciones || '');
  const consultDateTimestamp = dateTimestamp(patient.proximaConsulta);
  const today = new Date();
  const todayTimestamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const overdueNoShowFromSource = consultDateTimestamp !== null && consultDateTimestamp < todayTimestamp && hasMissedConsultNote;
  const currentConsultUpdate = consultUpdate ?? {
    outcome: overdueNoShowFromSource ? 'No asistió' as const : 'Pendiente' as const,
    observation: patient.observaciones || '',
  };
  const saveFollowUpDetail = (key: string, detail: FollowUpDetail) => {
    setFollowUpDetails((current) => {
      const next = { ...current, [`${patient.idFicticio}:${key}`]: detail };
      try {
        localStorage.setItem(FOLLOW_UP_DETAILS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // La información sigue visible durante esta sesión aunque el navegador bloquee el almacenamiento.
      }
      return next;
    });
  };
  const timeline = [
    { key: 'ingreso', label: 'Ingreso al centro', date: patient.fechaIngreso, status: 'Registrado', detail: 'Fecha de ingreso consignada en el archivo.' },
    { key: 'ultimo-control', label: 'Último control', date: patient.ultimoControl, status: 'Registrado', detail: 'Fecha de consulta consignada en el archivo.' },
    { key: 'proxima-consulta', label: 'Próxima consulta', date: patient.proximaConsulta, status: 'Programada en el registro', detail: 'Fecha reportada en el Excel; confirmar con el equipo tratante.' },
    { key: 'enfermeria-3m', label: 'Seguimiento de enfermería · 3 meses', date: patient.seguimiento3Fecha, status: patient.seguimiento3Estado || 'Sin dato', detail: 'Estado y fecha reportados en el archivo.' },
    { key: 'enfermeria-6m', label: 'Seguimiento de enfermería · 6 meses', date: patient.seguimiento6Fecha, status: patient.seguimiento6Estado || 'Sin dato', detail: 'Estado y fecha reportados en el archivo.' },
    { key: 'enfermeria-12m', label: 'Seguimiento de enfermería · 12 meses', date: patient.seguimiento12Fecha, status: patient.seguimiento12Estado || 'Sin dato', detail: 'Estado y fecha reportados en el archivo.' },
  ].filter((item) => item.date);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="patient-record-title" className="flex h-[90vh] max-h-[840px] w-full max-w-[960px] flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="relative shrink-0 border-b border-slate-100 bg-gradient-to-r from-pink-50 via-white to-white px-5 py-5 sm:px-8">
          <button onClick={onClose} aria-label="Cerrar ficha" className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-200 text-lg font-bold text-pink-800 shadow-md shadow-pink-100">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="patient-record-title" className="text-xl font-bold tracking-tight text-slate-900">{patient.paciente}</h2>
                <StatusPill value={patient.estadoCentro} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{patient.edad} años · {patient.sexo} · Ingreso {patient.fechaIngreso || missing}</p>
              <p className="mt-2 text-sm font-medium text-pink-700">{patient.etiologia || missing}</p>
            </div>
          </div>
        </header>

        {currentConsultUpdate.outcome === 'No asistió' && <div role="alert" className="mx-5 mt-4 flex shrink-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-8">
          <Clock3 className="h-4 w-4 shrink-0 text-amber-600" />
          <p><strong>Alerta de inasistencia:</strong> consulta registrada para {patient.proximaConsulta || 'fecha sin dato'}; agrega el seguimiento en el perfil.</p>
        </div>}

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:px-6" aria-label="Secciones de la ficha">
          {([
            ['perfil', 'Perfil clínico & Antropometría'],
            ['trayectoria', `Trayectoria de Controles (${timeline.length})`],
            ['sociodemografico', 'Datos Sociodemográficos & Contacto'],
          ] as Array<[PatientTab, string]>).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-2.5 py-3 text-xs font-semibold transition-colors ${activeTab === tab ? 'border-pink-600 text-pink-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </nav>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {activeTab === 'perfil' && <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <DetailCard label="Edad & sexo" value={`${patient.edad} años · ${patient.sexo}`} />
              <DetailCard label="Peso & talla" value={`${demoProfile.weightKg} kg · ${demoProfile.heightCm} cm`} simulated />
              <DetailCard label="IMC" value={`${demoProfile.bmi} kg/m²`} simulated />
              <DetailCard label="Grupo sanguíneo (RH)" value={demoProfile.bloodGroup} simulated />
              <DetailCard label="Etiología registrada" value={patient.etiologia || missing} />
            </div>
            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Próxima consulta</h3>
                  <p className="mt-1 font-mono text-sm text-slate-500">{patient.proximaConsulta || 'Sin fecha registrada'}</p>
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label="Resultado de la consulta">
                  {(['Pendiente', 'Asistió', 'No asistió'] as ConsultOutcome[]).map((outcome) => (
                    <button key={outcome} onClick={() => onUpdateConsult({ ...currentConsultUpdate, outcome })} aria-pressed={currentConsultUpdate.outcome === outcome} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${currentConsultUpdate.outcome === outcome ? outcome === 'No asistió' ? 'border-amber-300 bg-amber-50 text-amber-800' : outcome === 'Asistió' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-pink-300 bg-pink-50 text-pink-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {outcome}
                    </button>
                  ))}
                </div>
              </div>
              {currentConsultUpdate.outcome === 'No asistió' && <p className="mb-3 text-xs text-amber-700">Registra el seguimiento y las observaciones de esta consulta.</p>}
              <label className="block text-xs font-semibold text-slate-600" htmlFor="consult-observation">Observaciones de la consulta</label>
              <textarea id="consult-observation" value={currentConsultUpdate.observation} onChange={(event) => onUpdateConsult({ ...currentConsultUpdate, observation: event.target.value })} rows={3} placeholder="Agrega observaciones de asistencia, contacto o seguimiento…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
              <p className="mt-1.5 text-[10px] text-slate-400">Se guarda automáticamente en este navegador.</p>
            </section>
            <section className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Antecedentes y comorbilidades</h3>
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700">Simulado</span>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{demoProfile.antecedent}</div>
            </section>
            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="mb-2 text-sm font-bold text-slate-800">Observaciones y plan de seguimiento</h3>
              <p className="text-sm leading-relaxed text-slate-600">{patient.observaciones || 'No hay observaciones registradas.'}</p>
              {patient.motivoNoActividad && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Motivo de no actividad: {patient.motivoNoActividad}</p>}
              <div className="mt-3 flex flex-col justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row">
                <span>Último control registrado: {patient.ultimoControl || missing}</span>
                <span>Estado de la consulta: {currentConsultUpdate.outcome}</span>
              </div>
            </section>
            <p className="text-[11px] text-slate-400">Peso, talla, IMC, grupo sanguíneo y antecedentes son datos ficticios de demostración; no representan mediciones ni historia clínica real.</p>
          </div>}

          {activeTab === 'trayectoria' && <div className="space-y-4">
            <p className="text-sm text-slate-500">Fechas y seguimientos que figuran en el archivo para {patient.paciente}.</p>
            <div className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-6">
              {timeline.map((item) => {
                const detailKey = `${patient.idFicticio}:${item.key}`;
                const eventDetail = followUpDetails[detailKey] || createDemoFollowUpDetail(patient, item);
                const isOpen = openTimelineKey === item.key;
                const dateLabel = item.status === 'Realizado' ? 'Fecha en que se realizó' : item.status === 'Pendiente' || item.key === 'proxima-consulta' ? 'Fecha prevista' : 'Fecha registrada';
                return <div key={item.key} className="relative">
                  <span className={`absolute -left-[34px] top-4 z-10 h-4 w-4 rounded-full border-2 border-white ${item.status === 'Realizado' || item.status === 'Registrado' ? 'bg-emerald-300' : item.status === 'Pendiente' ? 'bg-amber-300' : 'bg-pink-300'}`} />
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenTimelineKey(isOpen ? null : item.key)} className={`w-full rounded-2xl border p-4 text-left transition-colors ${isOpen ? 'border-pink-200 bg-pink-50/40' : 'border-slate-100 bg-slate-50/80 hover:border-pink-100 hover:bg-white'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{item.label}</h3>
                      <FollowUpPill status={item.status} />
                    </div>
                    <p className="mt-2 font-mono text-xs text-slate-500">{dateLabel}: {item.date}</p>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-slate-600">{item.detail}</p>
                      <span className="text-xs font-semibold text-pink-700">{isOpen ? 'Ocultar detalle' : 'Ver detalle'}</span>
                    </div>
                  </button>
                  {isOpen && <section className="mt-2 space-y-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-2 rounded-xl border border-pink-100 bg-pink-50/70 px-3 py-2 text-xs text-pink-800">
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Simulado</span>
                      <p>Responsable y observación de demostración; puedes editarlos. No corresponden a una atención real.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{dateLabel}</p>
                        <p className="mt-1 font-mono text-sm text-slate-700">{item.date || missing}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estado</p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{item.status}</p>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`responsable-${detailKey}`} className="text-xs font-semibold text-slate-600">Quién realizó el seguimiento</label>
                      <input id={`responsable-${detailKey}`} value={eventDetail.responsable} onChange={(event) => saveFollowUpDetail(item.key, { ...eventDetail, responsable: event.target.value })} placeholder="Responsable de demostración" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-600">Observaciones generales registradas en el Excel</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{patient.observaciones || missing}</p>
                    </div>
                    <div>
                      <label htmlFor={`observacion-${detailKey}`} className="text-xs font-semibold text-slate-600">Observaciones específicas de este seguimiento</label>
                      <textarea id={`observacion-${detailKey}`} value={eventDetail.observacion} onChange={(event) => saveFollowUpDetail(item.key, { ...eventDetail, observacion: event.target.value })} rows={2} placeholder="Observación de demostración" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
                      <p className="mt-1 text-[10px] text-slate-400">Los cambios se guardan en este navegador.</p>
                    </div>
                  </section>}
                </div>;
              })}
            </div>
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-pink-700">Medicamentos consignados</h3>
              <p className="text-sm text-slate-600">{patient.medicamentos || missing}</p>
              <p className="mt-1 text-xs text-slate-500">Grupos: {patient.gruposMedicamentos || missing}</p>
            </section>
          </div>}

          {activeTab === 'sociodemografico' && <div className="grid gap-4 md:grid-cols-2">
            <DataGroup title="Aseguramiento & EPS" rows={[
              ['EPS', patient.eps || missing], ['Régimen', patient.regimen || missing], ['Plan', demoProfile.plan], ['Tipo de afiliación', demoProfile.affiliation],
            ]} />
            <DataGroup title="Ubicación y vivienda" rows={[
              ['Zona', patient.zona || missing], ['Procedencia', patient.ciudad || missing], ['Dirección', demoProfile.address], ['Convive con', demoProfile.household],
            ]} />
            <DataGroup title="Canales de contacto" rows={[
              ['Madre o familiar responsable', demoProfile.guardian],
              ['Teléfono móvil', demoProfile.mobile], ['Teléfono de casa', demoProfile.homePhone], ['Correo electrónico', demoProfile.email],
            ]} />
            <DataGroup title="Datos sociodemográficos" rows={[
              ['Edad', `${patient.edad} años`], ['Sexo', patient.sexo || missing], ['Estado civil', demoProfile.civilStatus], ['Escolaridad', demoProfile.schooling], ['Ocupación', demoProfile.occupation], ['Etnia / religión', demoProfile.ethnicityReligion],
            ]} />
          </div>}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-[11px] text-slate-500 sm:px-8">Datos de muestra · los valores con etiqueta “simulado” son ficticios y no corresponden a datos de contacto reales.</footer>
      </aside>
    </div>
  );
};

const DataGroup: React.FC<{ title: string; rows: Array<[string, string]> }> = ({ title, rows }) => (
  <section className="rounded-2xl border border-slate-200 p-4 md:p-5">
    <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">{title}</h3>
    <dl className="space-y-3">
      {rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 text-sm"><dt className="text-slate-500">{label}:</dt><dd className="max-w-[65%] text-right font-medium text-slate-700">{value}</dd></div>)}
    </dl>
  </section>
);

const DetailCard: React.FC<{ label: string; value: string; highlight?: boolean; icon?: React.ReactNode; simulated?: boolean }> = ({ label, value, highlight = false, icon, simulated = false }) => (
  <div className={`rounded-xl border p-4 ${highlight ? 'border-pink-100 bg-pink-50/50' : 'border-slate-100 bg-slate-50/60'}`}>
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{icon}{label}{simulated && <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[8px] font-bold text-pink-700">Simulado</span>}</div>
    <div className={`mt-2 text-sm font-semibold ${highlight ? 'font-mono text-pink-700' : 'text-slate-700'}`}>{value}</div>
  </div>
);
