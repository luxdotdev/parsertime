"use client";

import { Input } from "@lux/ui/input";
import { Label } from "@lux/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lux/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lux/ui/form";
import { parseDataFromXLSX } from "@/lib/parser";
import { useContext } from "react";
import { ParserDataContext } from "@/lib/parser-context";
import { useRouter } from "next/navigation";

export function FileUploader() {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="file_uploader">Choose a spreadsheet</Label>
      <Input id="file_uploader" type="file" accept=".xlsx, .xls" />
    </div>
  );
}

const ACCEPTED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 1000000; // 1MB in bytes

const formSchema = z.object({
  file: z
    .any()
    .refine((file) => file !== null && file !== undefined, "File is required.")
    .refine(
      (file) => file && file.size <= MAX_FILE_SIZE,
      "Max file size is 1MB."
    )
    .refine(
      (file) => file && ACCEPTED_FILE_TYPES.includes(file.type),
      ".xlsx files are accepted."
    ),
});

export function FileUploaderForm() {
  const { setData } = useContext(ParserDataContext);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: null,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    const result = await parseDataFromXLSX(values.file);
    setData(result);

    if (result) {
      router.push("/dashboard");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid w-full max-w-sm items-center gap-1.5"
      >
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Spreadsheet</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  id="file_uploader"
                  value={field.value?.fileName}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(event) => {
                    // @ts-expect-error - ts(18047) 'event.target.files' is possibly 'null'.
                    field.onChange(event.target.files[0]);
                  }}
                />
              </FormControl>
              <FormDescription>
                This is the parsed spreadsheet file that will be used to
                generate the data.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
