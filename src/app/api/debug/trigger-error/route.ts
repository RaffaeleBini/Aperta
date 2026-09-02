/**
 * Ruta de solo debug para verificar en producción que Sentry captura errores
 * reales de verdad (docs/devops-specs.md, sección Monitoraggio: "simula
 * autonomamente un errore y verifica que venga tracciato").
 */
export async function GET() {
  throw new Error("Error de prueba disparado a propósito para verificar Sentry");
}
