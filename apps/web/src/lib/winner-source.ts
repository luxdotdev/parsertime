/**
 * Provenance of a map winner chosen during upload: either the coordinate
 * algorithm's suggestion (`auto_coords`) or a user override (`manual`).
 *
 * Defined in a neutral leaf module so both client (bulk-upload types) and
 * server (API routes, persistence) can import it without pulling in
 * client-only dependencies.
 */
export type UploadWinnerSource = "auto_coords" | "manual";
