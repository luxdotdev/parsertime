"use client";

import InviteMemberModal from "@/components/team/invite-member-modal";
import { Button } from "@lux/ui/button";
import { Card, CardDescription, CardHeader } from "@lux/ui/card";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function AddMemberCard() {
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);

  return (
    <div className="p-2 w-1/3">
      <Card className="max-w-md h-36 flex flex-col justify-center items-center border-dashed">
        <CardHeader className="text-xl text-center">
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
