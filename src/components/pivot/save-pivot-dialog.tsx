"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export function SavePivotDialog({
  open,
  onOpenChange,
  initialName,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const t = useTranslations("pivot.builder");
  const [name, setName] = useState(initialName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("save")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pivot-name">{t("pivotName")}</Label>
          <Input id="pivot-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button disabled={!name.trim() || saving} onClick={() => onSave(name.trim())}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
