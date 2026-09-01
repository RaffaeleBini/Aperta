import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function Header() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-lg tracking-wide">
          {t("appName")}
        </Link>
        <Link href="/datasets" className="text-sm text-muted-foreground hover:text-foreground">
          {tNav("datasets")}
        </Link>
        <Link href="/dashboards" className="text-sm text-muted-foreground hover:text-foreground">
          {tNav("dashboards")}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
