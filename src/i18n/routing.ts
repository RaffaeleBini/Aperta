import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "gl", "it"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});
