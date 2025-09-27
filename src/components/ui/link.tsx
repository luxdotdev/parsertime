import { ProximityPrefetch } from "@/components/proximity-prefetch";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { default as NextLink } from "next/link";

type LinkProps = React.ComponentProps<typeof NextLink> & {
  external?: boolean;
};

export function Link(props: LinkProps) {
  const { external, ...nextLinkProps } = props;

  return (
    <ProximityPrefetch>
      <NextLink {...nextLinkProps} target={external ? "_blank" : props.target}>
        <span className={cn(external && "underline", props.className)}>
          {props.children}
        </span>
        {external && (
          <>
            {" "}
            <ExternalLinkIcon className="inline h-4 w-4" />
          </>
        )}
      </NextLink>
    </ProximityPrefetch>
  );
}
