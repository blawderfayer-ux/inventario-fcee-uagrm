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

/** Miles con punto y decimales con coma, como exige el formato boliviano. */
function num(n: number, decimals = 2): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = n < 0 ? '-' : '';
  return dec ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function buildTex(report: ReportData): string {
  const f = report.filters;
  const tipo =
    f.type === 'all'
      ? 'Todos los movimientos'
      : f.type === 'entradas'
        ? 'Solo entradas'
        : 'Solo salidas';

  const bodyRows = report.rows
    .map((r) =>
      [
        `\\codigo{${tex(r.sku)}}`,
        tex(r.name),
        tex(r.category),
        num(r.quantity, 0),
        num(r.minStock, 0),
        num(r.unitPrice),
        `\\textbf{${num(r.totalValue)}}`,
        r.estado === 'Crítico' ? '\\critico{Crítico}' : '\\normalstock{Normal}',
      ].join(' & ')
    )
    .map((line) => `${line} \\\\`)
    .join('\n');

  const maxValue = Math.max(1, ...report.byCategory.map((c) => c.value));
  const categoryRows = report.byCategory
    .map((c) => {
      const share = report.totalValue > 0 ? (c.value / report.totalValue) * 100 : 0;
      const width = (c.value / maxValue) * 4.2;
      return [
        tex(c.category),
        num(c.items, 0),
        num(c.units, 0),
        num(c.value),
        `${num(share, 1)}\\%`,
        `\\barra{${width.toFixed(3)}}`,
      ].join(' & ');
    })
    .map((line) => `${line} \\\\`)
    .join('\n');

  return `% =====================================================================
%  ${BRAND.university}
%  ${BRAND.faculty}
%
%  Informe de Inventario — generado automáticamente por ${BRAND.app}.
%
%  Compilación:   pdflatex informe-inventario.tex
%                 (ejecutar dos veces para resolver las referencias de página)
%
%  El escudo institucional es opcional: si el archivo logo-fcee.png está en
%  la misma carpeta que este documento, se incluye en la portada.
% =====================================================================
\\documentclass[11pt,a4paper]{article}

% ------------------------- Codificación e idioma -------------------------
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[spanish,es-nodecimaldot]{babel}
\\usepackage{microtype}

% ------------------------------- Formato --------------------------------
\\usepackage[left=2.2cm,right=2.2cm,top=3cm,bottom=2.4cm,headheight=15pt]{geometry}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{array}
\\usepackage{ragged2e}
\\usepackage[table]{xcolor}
\\usepackage{graphicx}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{titlesec}
\\usepackage{parskip}

% ---------------------------- Paleta institucional ----------------------------
\\definecolor{fceenavy}{HTML}{13294B}
\\definecolor{fceecrimson}{HTML}{9E1B32}
\\definecolor{fceegris}{HTML}{5B6B80}
\\definecolor{fceefondo}{HTML}{EEF3FA}
\\definecolor{fceeverde}{HTML}{16773A}

% ---------------------------- Estilo de secciones ----------------------------
\\titleformat{\\section}
  {\\normalfont\\large\\bfseries\\color{fceenavy}}{\\thesection.}{0.6em}{}
  [\\vspace{-0.65em}\\textcolor{fceecrimson}{\\rule{\\linewidth}{1pt}}]
\\titlespacing*{\\section}{0pt}{1.6em}{0.9em}

% ------------------------------ Encabezados ------------------------------
\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0.6pt}
\\renewcommand{\\footrulewidth}{0.4pt}
\\fancyhead[L]{\\footnotesize\\textcolor{fceenavy}{\\textbf{${tex(BRAND.short)}}}}
\\fancyhead[R]{\\footnotesize\\textcolor{fceenavy}{Informe de Inventario · Gestión ${tex(
    f.dateTo.slice(0, 4)
  )}}}
\\fancyfoot[L]{\\scriptsize\\textcolor{fceegris}{${tex(BRAND.app)} · Documento generado automáticamente}}
\\fancyfoot[R]{\\scriptsize\\textcolor{fceegris}{Página \\thepage\\ de \\pageref{LastPage}}}

% --------------------------- Columnas y utilidades ---------------------------
\\newcolumntype{R}[1]{>{\\RaggedLeft\\arraybackslash}p{#1}}
\\newcolumntype{L}[1]{>{\\RaggedRight\\arraybackslash}p{#1}}
\\newcolumntype{C}[1]{>{\\Centering\\arraybackslash}p{#1}}

\\newcommand{\\codigo}[1]{{\\ttfamily\\footnotesize #1}}
\\newcommand{\\critico}[1]{\\textcolor{fceecrimson}{\\footnotesize\\textbf{#1}}}
\\newcommand{\\normalstock}[1]{\\textcolor{fceeverde}{\\footnotesize #1}}
\\newcommand{\\barra}[1]{\\textcolor{fceenavy}{\\rule[-0.05em]{#1cm}{0.62em}}}
\\newcommand{\\cabecera}[1]{\\textcolor{white}{\\textbf{#1}}}

\\renewcommand{\\arraystretch}{1.28}
\\setlength{\\tabcolsep}{4pt}
\\setlength{\\LTcapwidth}{\\linewidth}

\\begin{document}

% ============================== Portada ==============================
\\thispagestyle{empty}
\\begin{center}
  \\IfFileExists{logo-fcee.png}{\\includegraphics[height=2.9cm]{logo-fcee.png}\\\\[0.9em]}{}

  {\\large\\bfseries\\color{fceenavy} ${tex(BRAND.university.toUpperCase())}}\\\\[0.4em]
  {\\normalsize\\color{fceenavy} ${tex(BRAND.faculty)}}\\\\[0.3em]
  {\\footnotesize\\color{fceegris} ${tex(BRAND.department)}}\\\\[1.4em]

  \\textcolor{fceecrimson}{\\rule{0.86\\linewidth}{1.4pt}}\\\\[1.1em]

  {\\LARGE\\bfseries Informe de Inventario}\\\\[0.9em]

  \\begin{tabular}{r@{\\hspace{0.8em}}l}
    \\footnotesize\\color{fceegris} PERÍODO      & \\small ${dmy(f.dateFrom)} al ${dmy(f.dateTo)} \\\\
    \\footnotesize\\color{fceegris} CATEGORÍA    & \\small ${tex(f.category)} \\\\
    \\footnotesize\\color{fceegris} MOVIMIENTOS  & \\small ${tex(tipo)} \\\\
    \\footnotesize\\color{fceegris} EMISIÓN      & \\small ${tex(new Date().toLocaleString('es-BO'))} \\\\
  \\end{tabular}\\\\[1.1em]

  \\textcolor{fceenavy}{\\rule{0.86\\linewidth}{0.6pt}}
\\end{center}

\\vspace{0.4em}

% ========================== Resumen ejecutivo ==========================
\\section{Resumen ejecutivo}

\\begin{center}
\\begin{tabular}{L{4.9cm} R{2.6cm} L{4.9cm} R{2.6cm}}
\\toprule
\\rowcolor{fceefondo}
\\textbf{Concepto} & \\textbf{Valor} & \\textbf{Concepto} & \\textbf{Valor} \\\\
\\midrule
Artículos registrados & ${num(report.rows.length, 0)} & Entradas del período & ${num(
    report.totalEntradas,
    0
  )} \\\\
Unidades en existencia & ${num(report.totalUnits, 0)} & Salidas del período & ${num(
    report.totalSalidas,
    0
  )} \\\\
Valor inventariado (Bs) & \\textbf{${num(report.totalValue)}} & Artículos en stock crítico & \\critico{${num(
    report.criticalCount,
    0
  )}} \\\\
\\bottomrule
\\end{tabular}
\\end{center}

% ======================== Detalle de existencias ========================
\\section{Detalle de existencias}

{\\footnotesize
\\begin{longtable}{L{1.7cm} L{3.8cm} L{2.1cm} R{1.0cm} R{0.9cm} R{1.45cm} R{1.75cm} C{1.3cm}}
\\toprule
\\rowcolor{fceenavy}
\\cabecera{Código} & \\cabecera{Descripción} & \\cabecera{Categoría} &
\\cabecera{Stock} & \\cabecera{Mín.} & \\cabecera{P. Unit.} &
\\cabecera{Valor (Bs)} & \\cabecera{Estado} \\\\
\\midrule
\\endfirsthead

\\toprule
\\rowcolor{fceenavy}
\\cabecera{Código} & \\cabecera{Descripción} & \\cabecera{Categoría} &
\\cabecera{Stock} & \\cabecera{Mín.} & \\cabecera{P. Unit.} &
\\cabecera{Valor (Bs)} & \\cabecera{Estado} \\\\
\\midrule
\\endhead

\\midrule
\\multicolumn{8}{r}{\\scriptsize\\itshape\\color{fceegris} Continúa en la página siguiente} \\\\
\\endfoot

\\midrule
\\rowcolor{fceefondo}
\\multicolumn{3}{l}{\\textbf{TOTAL INVENTARIADO}} &
\\textbf{${num(report.totalUnits, 0)}} & & &
\\textbf{${num(report.totalValue)}} & \\\\
\\bottomrule
\\endlastfoot

${bodyRows || '\\multicolumn{8}{c}{\\itshape Sin datos para los filtros seleccionados.} \\\\'}
\\end{longtable}
}

% ====================== Distribución por categoría ======================
\\section{Distribución por categoría}

{\\footnotesize
\\begin{center}
\\begin{tabular}{L{3.2cm} R{1.5cm} R{1.7cm} R{2.2cm} R{1.2cm} L{4.6cm}}
\\toprule
\\rowcolor{fceenavy}
\\cabecera{Categoría} & \\cabecera{Artículos} & \\cabecera{Unidades} &
\\cabecera{Valor (Bs)} & \\cabecera{\\%} & \\cabecera{Participación} \\\\
\\midrule
${categoryRows || '\\multicolumn{6}{c}{\\itshape Sin categorías con existencias.} \\\\'}
\\bottomrule
\\end{tabular}
\\end{center}
}

% =============================== Firmas ===============================
\\vspace{2.4em}

\\begin{center}
\\begin{tabular}{C{4.7cm} C{4.7cm} C{4.7cm}}
\\rule{4.3cm}{0.5pt} & \\rule{4.3cm}{0.5pt} & \\rule{4.3cm}{0.5pt} \\\\[-0.2em]
\\textbf{\\small Firma Contabilidad} & \\textbf{\\small Firma DGAA - DAF} & \\textbf{\\small Firma Responsable} \\\\[-0.4em]
{\\scriptsize\\color{fceegris} Contaduría F.C.E.E.} &
{\\scriptsize\\color{fceegris} Jefe Administrativo y Financiero} &
{\\scriptsize\\color{fceegris} Encargado de Almacén Facultativo} \\\\[-0.5em]
{\\scriptsize\\color{fceegris} U.A.G.R.M.} &
{\\scriptsize\\color{fceegris} U.A.G.R.M.} &
{\\scriptsize\\color{fceegris} U.A.G.R.M.} \\\\
\\end{tabular}
\\end{center}

\\vspace{1.6em}

{\\scriptsize\\color{fceegris}
\\textbf{Nota:} La información expuesta en el presente informe cuenta con la documentación
de soporte correspondiente, en el marco de las Normas Básicas del Sistema de Contabilidad
Integrada. Todos los movimientos de almacén quedan registrados y auditados en el sistema.
\\par}

\\end{document}
`;
}
