import {
  acquireWorkflowLease,
  releaseWorkflowLease,
  renewWorkflowLease,
} from "@/lib/workflow/lease";

export async function acquireLeaseStep(
  key: string,
  ownerId: string
): Promise<boolean> {
  "use step";

  return acquireWorkflowLease(key, ownerId);
}

export async function renewLeaseStep(
  key: string,
  ownerId: string
): Promise<void> {
  "use step";

  await renewWorkflowLease(key, ownerId);
}

export async function releaseLeaseStep(
  key: string,
  ownerId: string
): Promise<void> {
  "use step";

  await releaseWorkflowLease(key, ownerId);
}
