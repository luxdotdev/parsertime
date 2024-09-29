# Parsertime

<p align="center">
  <a href="https://parsertime.app/">
    <img src="https://parsertime.app/icon.png" height="96">
    <h3 align="center">Parsertime</h3>
  </a>
</p>

[![Website](https://img.shields.io/website?style=for-the-badge&labelColor=000&up_message=Operational&url=https%3A%2F%2Fparsertime.app)](https://parsertime.app)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/lucasdoell/parsertime/vitest.yml?style=for-the-badge&label=Tests&labelColor=000)
![GitHub Repo stars](https://img.shields.io/github/stars/lucasdoell/parsertime?style=for-the-badge&labelColor=000)

This is the repository for Parsertime, a web app written to help collegiate Overwatch players track their performance in scrims.

## What's inside?

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It uses [Tailwind CSS](https://tailwindcss.com/) for styling, [Prisma](https://prisma.io) for the ORM, and [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) for the database. It is deployed on [Vercel](https://vercel.com/).

## Features

- **User Accounts**: Users can create personal accounts to manage their data.
- **Team Management**: Allows the creation and management of different teams.
- **Scrim Data Integration**: Users can add scrimmage data using the ScrimTime workshop code.
- **Performance Dashboard**: A comprehensive dashboard presenting various statistics and insights about the user's gameplay.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS, React Query, shadcn UI
- **Backend**: Serverless Functions, Vercel Edge
- **Tools**: Prisma ORM, Vitest, ESLint, Prettier
- **Database**: Vercel Postgres (Neon), Upstash Redis, Vercel Blob, Vercel Edge Config
- **Deployment**: Vercel

## Getting Started

1. Clone the repository:
   ```sh
   git clone https://github.com/luxdotdev/parsertime.git
   ```
2. Install NPM packages:
   ```sh
   pnpm install
   ```
3. Set up your environment variables in a `.env` file based on the `.env.example` provided.

4. Run the development server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Useful Links

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Vercel](https://vercel.com/)

## Contributors

<a href="https://github.com/luxdotdev/parsertime/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=luxdotdev/parsertime" />
</a>

Thanks to all the contributors who have helped make Parsertime better!
