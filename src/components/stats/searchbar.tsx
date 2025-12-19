"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Link } from "@/components/ui/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  username: z.string().min(3).max(20),
});

export function Searchbar() {
  const t = useTranslations("statsPage.searchbar");
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (data.username.includes("#")) {
      // Remove the battle tag number
      data.username = data.username.split("#")[0];
    }

    router.push(`/stats/${data.username}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <FieldSet>
          <Field>
            <FieldLabel htmlFor="username">{t("placeholder")}</FieldLabel>
            <InputGroup className="max-w-xl">
              <InputGroupInput
                placeholder={t("placeholder")}
                className="h-12 text-lg"
                {...form.register("username")}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="submit"
                  onClick={() => form.handleSubmit(onSubmit)}
                >
                  Search
                  <ArrowRight />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              {t.rich("description", {
                span: (chunks) => (
                  <span className="font-semibold">{chunks}</span>
                ),
              })}
            </FieldDescription>
          </Field>
          <FieldSeparator>
            <Link href="/stats/hero" className="text-foreground text-sm">
              {t("link")} &rarr;
            </Link>
          </FieldSeparator>
        </FieldSet>
      </FieldGroup>
    </form>
  );
}
