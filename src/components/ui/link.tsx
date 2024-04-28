import { default as NextLink } from "next/link";
import { ExternalLinkIcon } from "@radix-ui/react-icons";

type LinkProps = React.ComponentProps<typeof NextLink> & {
  external?: boolean;
};

export function Link(props: LinkProps) {
  return (
    <NextLink {...props} target={props.external ? "_blank" : undefined}>
      <span className="underline">{props.children}</span>{" "}
      <ExternalLinkIcon className="inline h-4 w-4" />
    </NextLink>
  );
}
