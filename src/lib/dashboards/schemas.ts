import { z } from "zod";

export const createDashboardSchema = z.object({ name: z.string().min(1) });
export const renameDashboardSchema = z.object({ name: z.string().min(1) });

export const addDashboardItemSchema = z.object({
  itemType: z.enum(["chart", "pivot"]),
  itemId: z.string().min(1),
});

export const updateDashboardItemSchema = z.object({
  size: z.enum(["small", "medium", "large"]),
});

export const reorderDashboardItemsSchema = z.object({
  orderedItemIds: z.array(z.string().min(1)),
});
