import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // @duckdb/node-api carica binding nativi per-piattaforma a runtime: va
  // escluso dal bundle server, altrimenti webpack prova a risolvere staticamente
  // tutti i rami dello switch platform/arch e fallisce sulle piattaforme assenti.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
  // Immagine Docker minimale: copia solo i file necessari a runtime.
  output: "standalone",
};

export default withNextIntl(nextConfig);
