"use client";

import InviteMemberModal from "@/components/team/invite-member-modal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function AddMemberCard() {
  const t = useTranslations("teamPage");
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);

  return (
    <div className="w-full p-2 md:w-1/2 xl:w-1/3">
      <Card className="flex h-36 max-w-md flex-col items-center justify-center border-dashed">
        <CardHeader className="flex items-center justify-center text-xl">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <PlusCircledIcon className="h-6 w-6" />
            <span>{t("addMember")}</span>
          </div>
        </CardHeader>
        <CardDescription className="pb-4">
          <Button onClick={() => setShowInviteMemberModal(true)}>
            {t("inviteMember.title")}
          </Button>
        </CardDescription>
      </Card>
      <InviteMemberModal
        showInviteMemberModal={showInviteMemberModal}
        setShowInviteMemberModal={setShowInviteMemberModal}
      />
    </div>
  );
}
