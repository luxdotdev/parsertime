import { $Enums } from "@prisma/client";

export type BillingPlans = {
  id: string;
  testId: string;
  name: $Enums.BillingPlan;
  price: number;
  priceId: string;
  testPriceId: string;
  teamSize: number;
}[];
