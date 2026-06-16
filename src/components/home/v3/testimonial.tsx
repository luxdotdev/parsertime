import { Star } from "lucide-react";
import Image from "next/image";

type TestimonialProps = {
  starRating: string;
  quote: string;
  author: string;
  role: string;
};

export function Testimonial({
  starRating,
  quote,
  author,
  role,
}: TestimonialProps) {
  return (
    <section
      className="px-6 py-24 sm:py-32 lg:px-8"
      aria-label="Customer testimonial"
    >
      <figure className="mx-auto max-w-2xl">
        <p className="sr-only">{starRating}</p>
        <div className="text-primary flex gap-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              // oxlint-disable-next-line react/no-array-index-key
              key={`star-${i}`}
              className="h-4 w-4 flex-none fill-current"
              aria-hidden="true"
            />
          ))}
        </div>
        <blockquote className="border-primary/50 mt-8 border-l-4 pl-6 text-xl leading-8 font-medium tracking-tight sm:text-2xl sm:leading-9">
          <p>{quote}</p>
        </blockquote>
        <figcaption className="mt-10 flex items-center gap-x-5">
          <Image
            className="bg-muted h-12 w-12 rounded-full"
            src="/marketing/byzenith.jpg"
            alt="Photo of byZenith, head coach for Disguised"
            width={48}
            height={48}
          />
          <div className="text-sm leading-6">
            <div className="font-semibold">{author}</div>
            <div className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
              {role}
            </div>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
