import { expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

it("blocks over the limit, per key, and lets through again after the window", () => {
  const limiter = createRateLimiter(2, 1000);
  expect(limiter.check("a", 0).allowed).toBe(true);
  expect(limiter.check("a", 1).allowed).toBe(true);
  expect(limiter.check("a", 2)).toEqual({ allowed: false, retryAfterSeconds: 1 });
  expect(limiter.check("b", 2).allowed).toBe(true);
  expect(limiter.check("a", 1001).allowed).toBe(true);
});
