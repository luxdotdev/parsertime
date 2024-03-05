import { $Enums } from "@prisma/client";

export type BillingPlans = {
  id: string;
  name: $Enums.BillingPlan;
  price: number;
  priceId: string;
  teamSize: number;
}[];
