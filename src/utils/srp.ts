// Small helper to compute TrinityCore-compatible SRP6 verifier.
import { computeVerifier, params } from "trinitycore-srp6";

interface VerifierParams {
  username: string;
  password: string;
  salt: Buffer;
}

export function computeVerifierFor({
  username,
  password,
  salt,
}: VerifierParams): Buffer {
  // Trinity treats usernames case-insensitively in SRP
  return computeVerifier(
    params.trinitycore,
    salt,
    username.toUpperCase(),
    password
  );
}
