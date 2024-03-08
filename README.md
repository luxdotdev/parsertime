# Parsertime

<p align="center">
  <a href="https://parsertime.app">
    <img src="https://parsertime.app/icon.png" height="96">
    <h3 align="center">Parsertime</h3>
  </a>
</p>

[![Website](https://img.shields.io/website?style=for-the-badge&labelColor=000&up_message=Operational&url=https%3A%2F%2Fparsertime.app)](https://parsertime.app)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/lucasdoell/parsertime/vitest.yml?style=for-the-badge&label=Tests&labelColor=000)
![GitHub Repo stars](https://img.shields.io/github/stars/lucasdoell/parsertime?style=for-the-badge&labelColor=000)

This is the repository for Parsertime, a web app written to help collegiate Overwatch players track their performance in scrims.

## What's inside?

This is a [Turborepo](https://turbo.build/) project. It contains a [Next.js](https://nextjs.org/) app, a [Nextra](https://nextra.site) documentation
site, and a script to replicate the production database to a backup. The Next.js app uses [Tailwind CSS](https://tailwindcss.com/) for styling, [Prisma](https://prisma.io) for the ORM, and [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) for the database. It is deployed on [Vercel](https://vercel.com/).
The documentation site is also deployed on [Vercel](https://vercel.com/). The database replication script is run on a schedule using [Railway](https://railway.app/).

## Features

- **User Accounts**: Users can create personal accounts to manage their data.
- **Team Management**: Allows the creation and management of different teams.
- **Scrim Data Integration**: Users can add scrimmage data using the ScrimTime workshop code.
- **Performance Dashboard**: A comprehensive dashboard presenting various statistics and insights about the user's gameplay.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Prisma ORM
- **Database**: Vercel Postgres (Neon)
- **Deployment**: Vercel

## Getting Started

1. Clone the repository:
   ```sh
   git clone https://github.com/lucasdoell/parsertime.git
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
