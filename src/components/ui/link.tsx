import { default as NextLink } from "next/link";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

type LinkProps = React.ComponentProps<typeof NextLink> & {
  external?: boolean;
};

export function Link(props: LinkProps) {
  return (
    <NextLink {...props} target={props.external ? "_blank" : props.target}>
      <span className={cn(props.external && "underline", props.className)}>
        {props.children}
      </span>
      {props.external && (
        <>
          {" "}
          <ExternalLinkIcon className="inline h-4 w-4" />
        </>
      )}
    </NextLink>
  );
}
