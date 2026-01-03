import withVercelToolbar from "@vercel/toolbar/plugins/next";
import { withBotId } from "botid/next/config";
import { withAxiom } from "next-axiom";
import createNextIntlPlugin from "next-intl/plugin";

const cspHeader = `
    default-src 'self';
    script-src 'self' https://vercel.live https://vercel.com *.vercel-scripts.com  cdn.jsdelivr.net 'unsafe-inline' ${
      process.env.NODE_ENV === "production" ? "" : `'unsafe-eval' localhost:*`
    };
    style-src 'self' https://vercel.live https://vercel.com 'unsafe-inline' cdn.jsdelivr.net;
    connect-src 'self' https://vercel.live https://vercel.com *.vercel-storage.com *.pusher.com *.pusherapp.com wss://ws-us3.pusher.com ${
      process.env.NODE_ENV === "production"
        ? ""
        : `localhost:* ws://localhost:*`
    };
    img-src 'self' https://vercel.live https://vercel.com https://avatar.vercel.sh *.pusher.com/ https://lh3.googleusercontent.com https://cdn.discordapp.com https://avatars.githubusercontent.com *.vercel-storage.com blob: data:;
    frame-src 'self' https://vercel.live https://vercel.com https://www.youtube.com https://youtu.be/ https://www.youtube-nocookie.com https://player.twitch.tv;
    font-src 'self' https://vercel.live https://assets.vercel.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/a/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s2qw9udutrlis7qk.public.blob.vercel-storage.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "lux.dev",
        port: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withBotId(
  // @ts-expect-error - broken types
  withNextIntl(withAxiom(withVercelToolbar()(nextConfig)))
);
