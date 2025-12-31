import { getUser } from "@/data/user-dto";
import { auth } from "@/lib/auth";
import { $Enums, type User } from "@prisma/client";
import { get } from "@vercel/edge-config";

const FEATURES = [
  "create-team",
  "create-scrim",
  "stats-timeframe-1",
  "stats-timeframe-2",
  "stats-timeframe-3",
] as const;

type Feature = (typeof FEATURES)[number];

type FeatureLevel =
  | keyof typeof $Enums.BillingPlan
  | typeof $Enums.UserRole.ADMIN;

/**
 * Permission class to check if a user has permission to access a feature.
 * The permission is based on the user's role and billing plan.
 * The permission levels are as follows:
 * - FREE: All users have access to this feature
 * - BASIC: Only users on the basic billing plan or above have access to this feature
 * - PREMIUM: Only users on the premium billing plan have access to this feature
 * - ADMIN: Only users with the admin role have access to this feature
 *
 * The permission levels are defined in the `permissions` edge store on Vercel.
 */
export class Permission {
  private feature: Feature;
  private permissions =
    get<Promise<Record<Feature, FeatureLevel>>>("permissions");

  constructor(feature: Feature) {
    this.feature = feature;
    if (!FEATURES.includes(feature)) {
      throw new Error(`Invalid feature: ${feature}`);
    }
  }

  /**
   * Check if the user has permission to access the feature.
   * @returns True if the user has permission, false otherwise
   */
  public async check() {
    const { user, isAuthed } = await this.checkUser();

    // If the user is not authenticated, they do not have permission.
    if (!isAuthed || !user) {
      return false;
    }

    const permissions = await this.permissions;
    const level = permissions![this.feature];

    if (user.role === $Enums.UserRole.ADMIN) return true;
    else if (level === "FREE") return true;
    else if (level === "BASIC") return this.checkBasic(user);
    else if (level === "PREMIUM") return this.checkPremium(user);

    return false;
  }

  private async checkUser() {
    const session = await auth();
    if (!session?.user) {
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

/**
 * Convenience function to check if a user has permission to access a feature.
 *
 * @param feature The feature to check
 * @returns True if the user has permission, false otherwise
 * @example const hasPermission = await check("create-team"); // true
 */
export async function check(feature: Feature) {
  const permission = new Permission(feature);
  return await permission.check();
}
