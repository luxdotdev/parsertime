import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import Logger from "@/lib/logger";
import { $Enums, User } from "@prisma/client";
import { get } from "@vercel/edge-config";

const FEATURES = ["create-team", "create-scrim"] as const;

type Feature = (typeof FEATURES)[number];

type FeatureLevel =
  | keyof typeof $Enums.BillingPlan
  | typeof $Enums.UserRole.ADMIN;

export class Permission {
  private feature: Feature;
  private permissions = get("permissions") as Promise<
    Record<Feature, FeatureLevel>
  >;

  constructor(feature: Feature) {
    this.feature = feature;
    if (!FEATURES.includes(feature)) {
      throw new Error(`Invalid feature: ${feature}`);
    }
  }

  public async check() {
    const { user, isAuthed } = await this.checkUser();

    // If the user is not authenticated, they do not have permission.
    if (!isAuthed || !user) {
      return false;
    }

    if (user.role === $Enums.UserRole.ADMIN) {
      return true;
    }

    const permissions = await this.permissions;
    const level = permissions[this.feature];

    Logger.log("Permission level", level);

    if (level === "FREE") return true;
    else if (level === "BASIC") return this.checkBasic(user);
    else if (level === "PREMIUM") return this.checkPremium(user);

    return false;
  }

  private async checkUser() {
    const session = await auth();
    if (!session || !session.user) {
      return { user: null, isAuthed: false };
    }

    const user = await getUser(session.user.email);
    if (!user) {
      return { user: null, isAuthed: false };
    }

    return { user, isAuthed: true };
  }

  private checkBasic(user: User) {
    if (user.billingPlan === $Enums.BillingPlan.FREE) return false;
    return true; // check if user is on basic or above
  }

  private checkPremium(user: User) {
    if (user.billingPlan === $Enums.BillingPlan.FREE) return false;
    if (user.billingPlan === $Enums.BillingPlan.BASIC) return false;
    return true; // check if user is on premium
  }
}
