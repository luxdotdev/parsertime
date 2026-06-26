import { UpdateModal } from "@/components/dashboard/update-modal";
import { get } from "@vercel/edge-config";

export type UpdateModalData = {
  date: string;
  title: string;
  content: string;
};

export async function UpdateModalWrapper() {
  const data = await get<UpdateModalData>("updateModal");
  if (!data) return null;

  return <UpdateModal data={data} />;
}
