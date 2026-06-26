import withVercelToolbar from "@vercel/toolbar/plugins/next";
import { NextConfig } from "next";
import { withAxiom } from "next-axiom";
import createNextIntlPlugin from "next-intl/plugin";

const cspHeader = `
    default-src 'self';
    script-src 'self' https://vercel.live https://vercel.com *.vercel-scripts.com  cdn.jsdelivr.net 'unsafe-inline' ${
      process.env.NODE_ENV === "production" ? "" : `'unsafe-eval' localhost:*`
    };
    style-src 'self' https://vercel.live https://vercel.com 'unsafe-inline' cdn.jsdelivr.net;
    connect-src 'self' https://vercel.live https://vercel.com *.r2.cloudflarestorage.com *.pusher.com *.pusherapp.com wss://ws-us3.pusher.com https://api.axiom.co ${
      process.env.NODE_ENV === "production"
        ? ""
        : `localhost:* ws://localhost:*`
    };
    img-src 'self' https://vercel.live https://vercel.com https://avatar.vercel.sh *.pusher.com/ https://lh3.googleusercontent.com https://cdn.discordapp.com https://avatars.githubusercontent.com *.r2.cloudflarestorage.com blob: data:;
    frame-src 'self' https://vercel.live https://vercel.com https://www.youtube.com https://youtu.be/ https://www.youtube-nocookie.com https://player.twitch.tv;
    font-src 'self' https://vercel.live https://assets.vercel.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: ["@parsertime/transactional"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    authInterrupts: true,
    viewTransition: true,
    optimizePackageImports: ["@radix-ui/react-icons"],
    proxyClientMaxBodySize: "150mb",
  },
  images: {
    localPatterns: [
      // Avatar/banner/team images are served from the R2 proxy with a
      // cache-busting `?v=<timestamp>`. Omitting `search` allows any query
      // string, but scoped to this path only.
      { pathname: "/api/image/**" },
      // Defining localPatterns switches local images to allow-list mode, so keep
      // every other local image (e.g. /ranks/*.png) working — without a query.
      { pathname: "/**", search: "" },
    ],
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

export default withNextIntl(withAxiom(withVercelToolbar()(nextConfig)));
