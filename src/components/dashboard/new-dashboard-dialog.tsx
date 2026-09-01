"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function NewDashboardDialog() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      router.push(`/dashboards/${json.dashboard.id}`);
    } catch {
      toast.error(t("errors.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button className="w-fit" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("newDashboard")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newDashboard")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dashboard-name">{t("dashboardName")}</Label>
            <Input id="dashboard-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button disabled={!name.trim() || saving} onClick={handleCreate}>
              {t("newDashboard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
