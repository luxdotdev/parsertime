/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

const withVercelToolbar = require("@vercel/toolbar/plugins/next")();
const { withAxiom } = require("next-axiom");

module.exports = withAxiom(withVercelToolbar(nextConfig));
