export interface NotebookCell {
  cell_type: "markdown" | "code";
  metadata: Record<string, never>;
  source: string[];
  outputs?: unknown[];
  execution_count?: null;
}

/** nbformat representa `source` como un array de líneas, cada una terminada en "\n" salvo la última. */
function toSourceLines(source: string): string[] {
  const lines = source.split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line));
}

export function markdownCell(source: string): NotebookCell {
  return { cell_type: "markdown", metadata: {}, source: toSourceLines(source) };
}

export function codeCell(source: string): NotebookCell {
  return { cell_type: "code", metadata: {}, source: toSourceLines(source), outputs: [], execution_count: null };
}

/** Ensambla un `.ipynb` (nbformat 4.5) válido a partir de una lista de celdas. */
export function assembleNotebook(cells: NotebookCell[]): string {
  const notebook = {
    cells,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python", pygments_lexer: "ipython3" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
  return JSON.stringify(notebook, null, 1);
}
