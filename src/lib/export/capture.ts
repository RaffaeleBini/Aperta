"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Captura un nodo del DOM (incluida la leyenda HTML de Recharts, que vive fuera del <svg>) como PNG. */
export async function downloadNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2 });
  triggerDownload(dataUrl, filename);
}

/** Igual que downloadNodeAsPng, pero envuelve la imagen resultante en un PDF de una página. */
export async function downloadNodeAsPdf(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2 });
  const { width, height } = node.getBoundingClientRect();

  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });
  doc.addImage(dataUrl, "PNG", 0, 0, width, height);
  doc.save(filename);
}
