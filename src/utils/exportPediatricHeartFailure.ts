import { PediatricHeartFailureRecord, PEDIATRIC_HEART_FAILURE_SOURCE } from '../data/pediatricHeartFailurePatients';

const fields = Object.keys(PEDIATRIC_HEART_FAILURE_SOURCE) as (keyof PediatricHeartFailureRecord)[];

export function exportPediatricHeartFailure(pacientes: PediatricHeartFailureRecord[]) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const headings = fields.map((field) => quote(PEDIATRIC_HEART_FAILURE_SOURCE[field]));
  const rows = pacientes.map((patient) => fields.map((field) => quote(patient[field])).join(';'));
  const blob = new Blob(['\uFEFF', headings.join(';'), '\n', rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `centro_falla_cardiaca_pediatrica_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
