// Minimal shape the templates read off a Prisma `User`. A full `User`
// is structurally assignable to this, so call sites need no changes.
export type EmailUser = {
  name: string | null;
  email: string;
};
