import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

export function CreateTeamDialog({
  setShowNewTeamDialog,
  setNewTeamCreated,
}: {
  setShowNewTeamDialog: (show: boolean) => void;
  setNewTeamCreated: (created: boolean) => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    fetch("/api/create-team", {
      method: "POST",
      body: JSON.stringify(values),
    }).then((res) => {
      if (res.ok) {
        setShowNewTeamDialog(false);
        setNewTeamCreated(true);
        toast({
          title: "Team created!",
          description: "Your team has been created successfully.",
        });
        setLoading(false);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: `An error occurred: ${res.statusText} (${res.status})`,
        });
        setLoading(false);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create team</DialogTitle>
        <DialogDescription>
          Add a new team to manage products and customers.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <div className="space-y-4 py-2 pb-4">
                <div className="space-y-2">
                  <FormLabel>Team name</FormLabel>
                  <FormControl>
                    <Input placeholder="Esports at Cornell" {...field} />
                  </FormControl>
                  <FormMessage />
                </div>
              </div>
            )}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewTeamDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating team..." : "Create team"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
