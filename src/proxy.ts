import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  // Esclude le API routes (non localizzate), gli asset Next.js e i file statici.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
