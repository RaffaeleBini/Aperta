"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { STEP_TYPES } from "@/lib/transformations/types";
import type { StepType } from "@/lib/transformations/types";

export function AddStepMenu({ onSelect }: { onSelect: (stepType: StepType) => void }) {
  const t = useTranslations("transform");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {t("addStep")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STEP_TYPES.map((stepType) => (
          <DropdownMenuItem key={stepType} onSelect={() => onSelect(stepType)}>
            {t(`stepTypes.${stepType}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
