# Parsertime

[![Website](https://img.shields.io/website?style=for-the-badge&labelColor=000&up_message=Operational&url=https%3A%2F%2Fparsertime.app)](https://parsertime.app)
[![GitHub followers](https://img.shields.io/github/followers/lucasdoell?logo=github&style=for-the-badge&labelColor=000)](https://github.com/lucasdoell)

This is the repository for Parsertime, a web app written to help collegiate Overwatch players track their performance in scrims.

## What's inside?

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It uses [Tailwind CSS](https://tailwindcss.com/) for styling, [Prisma](https://prisma.io) for the ORM, and [PlanetScale](https://planetscale.com/) for the database. It is deployed on [Vercel](https://vercel.com/).

## Features

- **User Accounts**: Users can create personal accounts to manage their data.
- **Team Management**: Allows the creation and management of different teams.
- **Scrim Data Integration**: Users can add scrimmage data using the ScrimTime workshop code.
- **Performance Dashboard**: A comprehensive dashboard presenting various statistics and insights about the user's gameplay.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Prisma ORM
- **Database**: MySQL, hosted on PlanetScale
- **Deployment**: Vercel

## Getting Started

1. Clone the repository:
   ```sh
   git clone [repository URL]
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
- [PlanetScale](https://planetscale.com/)
- [Vercel](https://vercel.com/)
