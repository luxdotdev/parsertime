"use client";

import InviteMemberModal from "@/components/team/invite-member-modal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function AddMemberCard() {
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);

  return (
    <div className="w-full p-2 md:w-1/2 xl:w-1/3">
      <Card className="flex h-36 max-w-md flex-col items-center justify-center border-dashed">
        <CardHeader className="text-center text-xl">
          <span className="inline-flex items-center justify-center space-x-2">
            <PlusCircledIcon className="h-6 w-6" /> <span>Add a member...</span>
          </span>
        </CardHeader>
        <CardDescription className="pb-4">
          <Button onClick={() => setShowInviteMemberModal(true)}>
            Invite Member
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
