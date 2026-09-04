/**
 * Utility to export chart data and visuals (PNG, SVG, CSV, JSON).
 */

export function exportDataAsCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDataAsJson(filename: string, data: any) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\s+/g, '_')}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportChartAsSvg(chartElementId: string, filename: string) {
  const container = document.getElementById(chartElementId);
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\s+/g, '_')}.svg`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
