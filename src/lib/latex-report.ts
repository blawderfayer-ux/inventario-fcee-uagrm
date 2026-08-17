import type { ReportData } from './reports';
import { BRAND } from './brand';

/** Escapa los caracteres que LaTeX interpreta como comandos. */
function tex(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function num(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function buildTex(report: ReportData): string {
  const f = report.filters;
  const tipo =
    f.type === 'all' ? 'Todos los movimientos' : f.type === 'entradas' ? 'Solo entradas' : 'Solo salidas';

  const bodyRows = report.rows
    .map((r) => {
      const estado =
        r.estado === 'Crítico' ? '\\textcolor{fceecrimson}{\\textbf{Crítico}}' : 'Normal';
      return [
        `\\texttt{${tex(r.sku)}}`,
        tex(r.name),
        tex(r.category),
        num(r.quantity, 0),
        num(r.minStock, 0),
        num(r.unitPrice),
        `\\textbf{${num(r.totalValue)}}`,
        estado,
      ].join(' & ');
    })
    .map((line) => `${line} \\\\`)
    .join('\n');

  const maxValue = Math.max(1, ...report.byCategory.map((c) => c.value));
  const categoryRows = report.byCategory
    .map((c) => {
      const share = report.totalValue > 0 ? (c.value / report.totalValue) * 100 : 0;
      // Barra proporcional dibujada con \rule: no requiere paquetes de gráficos.
      const width = (c.value / maxValue) * 5;
      return [
        tex(c.category),
        num(c.items, 0),
        num(c.units, 0),
        num(c.value),
        `${num(share, 1)}\\%`,
        `\\textcolor{fceenavy}{\\rule{${width.toFixed(3)}cm}{8pt}}`,
      ].join(' & ');
    })
    .map((line) => `${line} \\\\`)
    .join('\n');

  return `% ============================================================
% Informe de Inventario — ${BRAND.faculty}
% ${BRAND.university}
%
% Generado automáticamente por ${BRAND.app}.
% Compilar con:  pdflatex informe-inventario.tex
% El escudo (logo-fcee.png) es opcional: si está en la misma
% carpeta que este archivo, se incluye en la portada.
% ============================================================
\\documentclass[11pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish,es-nodecimaldot]{babel}
\\usepackage[left=2cm,right=2cm,top=2.6cm,bottom=2.2cm]{geometry}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{array}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\usepackage{graphicx}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{caption}

\\definecolor{fceenavy}{HTML}{13294B}
\\definecolor{fceecrimson}{HTML}{9E1B32}
\\definecolor{fceesoft}{HTML}{F2F6FC}

\\captionsetup{font=small,labelfont={bf,color=fceenavy}}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0.4pt}
\\fancyhead[L]{\\small\\textcolor{fceenavy}{${tex(BRAND.faculty)}}}
\\fancyhead[R]{\\small\\textcolor{fceenavy}{Informe de Inventario}}
\\fancyfoot[L]{\\scriptsize ${tex(BRAND.app)} · Documento generado automáticamente}
\\fancyfoot[R]{\\scriptsize Página \\thepage\\ de \\pageref{LastPage}}

\\newcolumntype{R}[1]{>{\\raggedleft\\arraybackslash}p{#1}}
\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}
\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}

\\begin{document}

% ---------------------------- Portada ----------------------------
\\begin{center}
  \\IfFileExists{logo-fcee.png}{\\includegraphics[height=2.6cm]{logo-fcee.png}\\\\[0.5em]}{}
  {\\Large\\bfseries\\color{fceenavy} ${tex(BRAND.university.toUpperCase())}}\\\\[0.35em]
  {\\large\\color{fceenavy} ${tex(BRAND.faculty)}}\\\\[0.9em]
  \\textcolor{fceecrimson}{\\rule{\\linewidth}{1.2pt}}\\\\[0.5em]
  {\\Large\\bfseries Informe de Inventario}\\\\[0.4em]
  {\\normalsize Período del ${dmy(f.dateFrom)} al ${dmy(f.dateTo)}}\\\\[0.2em]
  {\\small Categoría: ${tex(f.category)} \\quad·\\quad ${tex(tipo)}}\\\\[0.2em]
  {\\footnotesize Emitido el ${tex(new Date().toLocaleString('es-BO'))}}
\\end{center}

\\vspace{0.6em}

% ---------------------------- Resumen ----------------------------
\\section*{Resumen ejecutivo}

\\begin{center}
\\renewcommand{\\arraystretch}{1.35}
\\begin{tabular}{L{4.6cm} R{3.2cm} L{4.6cm} R{3.2cm}}
\\toprule
\\rowcolor{fceesoft}
\\textbf{Concepto} & \\textbf{Valor} & \\textbf{Concepto} & \\textbf{Valor} \\\\
\\midrule
Artículos registrados & ${num(report.rows.length, 0)} & Entradas del período & ${num(report.totalEntradas, 0)} \\\\
Unidades en stock & ${num(report.totalUnits, 0)} & Salidas del período & ${num(report.totalSalidas, 0)} \\\\
Valor inventariado & Bs. ${num(report.totalValue)} & Artículos en stock crítico & \\textcolor{fceecrimson}{\\textbf{${num(report.criticalCount, 0)}}} \\\\
\\bottomrule
\\end{tabular}
\\end{center}

\\vspace{0.8em}

% ------------------------ Detalle por artículo ------------------------
\\section*{Detalle de existencias}

\\renewcommand{\\arraystretch}{1.25}
\\begin{longtable}{L{2.1cm} L{4.6cm} L{2.3cm} R{1.3cm} R{1.3cm} R{1.9cm} R{2.1cm} C{1.7cm}}
\\toprule
\\rowcolor{fceenavy}
\\textcolor{white}{\\textbf{Código}} &
\\textcolor{white}{\\textbf{Descripción}} &
\\textcolor{white}{\\textbf{Categoría}} &
\\textcolor{white}{\\textbf{Stock}} &
\\textcolor{white}{\\textbf{Mín.}} &
\\textcolor{white}{\\textbf{P. Unit.}} &
\\textcolor{white}{\\textbf{Valor}} &
\\textcolor{white}{\\textbf{Estado}} \\\\
\\midrule
\\endfirsthead

\\toprule
\\rowcolor{fceenavy}
\\textcolor{white}{\\textbf{Código}} &
\\textcolor{white}{\\textbf{Descripción}} &
\\textcolor{white}{\\textbf{Categoría}} &
\\textcolor{white}{\\textbf{Stock}} &
\\textcolor{white}{\\textbf{Mín.}} &
\\textcolor{white}{\\textbf{P. Unit.}} &
\\textcolor{white}{\\textbf{Valor}} &
\\textcolor{white}{\\textbf{Estado}} \\\\
\\midrule
\\endhead

\\midrule
\\multicolumn{8}{r}{\\footnotesize\\itshape Continúa en la página siguiente} \\\\
\\endfoot

\\midrule
\\rowcolor{fceesoft}
\\multicolumn{3}{l}{\\textbf{TOTAL INVENTARIADO}} &
\\textbf{${num(report.totalUnits, 0)}} & &
& \\textbf{Bs. ${num(report.totalValue)}} & \\\\
\\bottomrule
\\endlastfoot

${bodyRows || '\\multicolumn{8}{c}{\\itshape Sin datos para los filtros seleccionados.} \\\\'}
\\end{longtable}

\\vspace{0.6em}

% ------------------------ Resumen por categoría ------------------------
\\section*{Distribución por categoría}

\\renewcommand{\\arraystretch}{1.3}
\\begin{center}
\\begin{tabular}{L{3.6cm} R{1.8cm} R{1.9cm} R{2.6cm} R{1.7cm} L{5.2cm}}
\\toprule
\\rowcolor{fceenavy}
\\textcolor{white}{\\textbf{Categoría}} &
\\textcolor{white}{\\textbf{Artículos}} &
\\textcolor{white}{\\textbf{Unidades}} &
\\textcolor{white}{\\textbf{Valor (Bs.)}} &
\\textcolor{white}{\\textbf{\\%}} &
\\textcolor{white}{\\textbf{Participación}} \\\\
\\midrule
${categoryRows || '\\multicolumn{6}{c}{\\itshape Sin categorías con existencias.} \\\\'}
\\bottomrule
\\end{tabular}
\\end{center}

\\vfill
\\begin{center}
\\footnotesize\\color{fceenavy}
${tex(BRAND.university)} · ${tex(BRAND.faculty)}\\\\
${tex(BRAND.department)} — Todos los accesos y movimientos quedan auditados.
\\end{center}

\\end{document}
`;
}

