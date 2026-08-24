"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <Select
      value={locale}
      onValueChange={(nextLocale) => {
        router.replace(
          // @ts-expect-error -- pathname è tipizzato sulle route note, qui usiamo la corrente
          { pathname, params },
          { locale: nextLocale }
        );
      }}
    >
      <SelectTrigger className="w-28" aria-label={t("label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {t(loc)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
