// Small helper to compute TrinityCore-compatible SRP6 verifier.
import { computeVerifier, params } from "trinitycore-srp6";

export function computeVerifierFor({ username, password, salt }) {
  // Trinity treats usernames case-insensitively in SRP
  return computeVerifier(
    params.trinitycore,
    salt,
    username.toUpperCase(),
    password
  );
}
