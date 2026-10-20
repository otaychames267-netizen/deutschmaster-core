/** Public half of the VAPID key pair (safe to ship). The private half lives only in the server env VAPID_PRIVATE_KEY.
 * Rotating the pair = new public key here + new env value; every device then re-subscribes on its next visit. */
export const VAPID_PUBLIC_KEY =
  "BOD_tK5w-QVMwy04UHqXWayRf7L18fu6UfdNl3sENOy0Kan5KI0sFLz05fFSq4AtEi-Y4qVTuShXM0IlYf6ykgA";

/** Contact for the push services (RFC 8292 "sub"). A site URL, so no personal e-mail address reaches Google/Apple/Mozilla. */
export const VAPID_SUBJECT = "https://www.auralingoviatestdeutsch.academy";
