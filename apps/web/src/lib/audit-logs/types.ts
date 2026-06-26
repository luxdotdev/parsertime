import type { $Enums } from "@/generated/prisma/client";

// Re-export the Prisma enum type
export type AuditLogAction = $Enums.AuditLogAction;

// Arguments for creating an audit log entry
export type AuditLogArgs = {
  userEmail: string;
  action: AuditLogAction;
  target: string;
  details: string;
};
