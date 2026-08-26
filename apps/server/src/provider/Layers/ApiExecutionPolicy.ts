export type ApiVerificationMode = "focused";

export interface ApiExecutionPolicy {
  readonly maxProviderRequests: number;
  readonly maxTransportRetries: number;
  readonly maxConcurrentSafeTools: number;
  readonly maxObservationChars: number;
  readonly maxPatchBytes: number;
  readonly verificationMode: ApiVerificationMode;
}

export const DEFAULT_API_EXECUTION_POLICY: ApiExecutionPolicy = {
  maxProviderRequests: 4,
  maxTransportRetries: 1,
  maxConcurrentSafeTools: 8,
  maxObservationChars: 48_000,
  maxPatchBytes: 2_000_000,
  verificationMode: "focused",
};
