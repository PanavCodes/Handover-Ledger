import { describe, it, expect } from "vitest";
import { verifyQuote, normaliseWithMap, computeLexicalSupport } from "../lib/verifier";
import { computeWordDiff } from "../lib/diff";

describe("Deterministic Citation Verifier & Quote Snapping", () => {
  const sampleDoc = `
# Aurora Rover Architecture Decision

Date: 2025-02-14
Author: Rahul Mehta

We have evaluated multiple protocols for ground-to-rover telemetry.
After testing ROS 2 topics and gRPC, we decided to adopt MQTT over TLS for all telemetry streams.
Kafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano (4GB).

Primary maintainer of the motor controller firmware is Rahul Mehta.
ServoWorks contact: Priya Sharma (support@servoworks.example).
`;

  it("verifies exact normalized quotes with smart quotes and newlines", () => {
    const quote = "we decided to adopt MQTT over TLS for all telemetry streams.";
    const result = verifyQuote(sampleDoc, quote);

    expect(result.verified).toBe(true);
    expect(result.method).toBe("exact_normalised");
    expect(result.start_offset).toBeGreaterThan(0);
    expect(result.end_offset).toBeGreaterThan(result.start_offset);

    // Verify exact slice from canonical document text
    const extracted = sampleDoc.slice(result.start_offset, result.end_offset);
    expect(extracted).toContain("we decided to adopt MQTT over TLS for all telemetry streams.");
  });

  it("handles smart quotes, em-dashes, and multiple spaces", () => {
    const docWithSmartQuotes = `We chose the “Jetson Nano” — discarding Raspberry Pi.`;
    const quote = `We chose the "Jetson Nano" - discarding Raspberry Pi.`;

    const result = verifyQuote(docWithSmartQuotes, quote);
    expect(result.verified).toBe(true);
    expect(docWithSmartQuotes.slice(result.start_offset, result.end_offset)).toBe(docWithSmartQuotes);
  });

  it("rejects hallucinated quotes that do not exist in the source", () => {
    const fakeQuote = "We decided to migrate our entire backend to Rust and Kubernetes immediately.";
    const result = verifyQuote(sampleDoc, fakeQuote);

    expect(result.verified).toBe(false);
    expect(result.method).toBe("failed");
    expect(result.reason).toContain("rejected by verifier");
  });

  it("rejects quotes that expose raw secret keys", () => {
    const docWithSecret = "API Key: ghp_123456789012345678901234567890 (vault 'rover-ops')";
    const secretQuote = "API Key: ghp_123456789012345678901234567890";

    const result = verifyQuote(docWithSecret, secretQuote);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain("secret guard");
  });

  it("rejects quotes below the minimum length of 12 characters", () => {
    const shortQuote = "Rahul Mehta";
    const result = verifyQuote(sampleDoc, shortQuote);

    expect(result.verified).toBe(false);
    expect(result.reason).toContain("minimum required 12 characters");
  });

  it("snaps quotes using anchor search when minor boundary differences occur", () => {
    // Quote has an extra word at the tail not in document, but anchor matches strongly
    const slightlyAltered = "Kafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano";
    const result = verifyQuote(sampleDoc, slightlyAltered);

    expect(result.verified).toBe(true);
    expect(result.method).toBe("exact_normalised");
  });

  it("computes lexical support scores accurately", () => {
    const claim = "We decided to adopt MQTT over TLS for telemetry";
    const quote = "we decided to adopt MQTT over TLS for all telemetry streams.";
    const score = computeLexicalSupport(claim, quote);

    expect(score).toBeGreaterThan(0.6);
  });

  it("generates word-level hallucination diffs correctly", () => {
    const fakeQuote = "We decided to adopt Kafka over AWS cloud";
    const diff = computeWordDiff(fakeQuote, sampleDoc);

    expect(diff.hallucinatedCount).toBeGreaterThan(0);
    expect(diff.diffHtml).toContain("line-through");
  });
});
