import { randomBytes } from "node:crypto";

import type { IdPrefix } from "../../core/src/index.js";
import type { Clock, IdGenerator } from "../../ports/src/index.js";

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class DeterministicClock implements Clock {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return new Date(this.fixedDate);
  }
}

export class DeterministicIdGenerator implements IdGenerator {
  private nextValue = 1;

  generate(prefix: IdPrefix): string {
    const suffix = String(this.nextValue).padStart(4, "0");
    this.nextValue += 1;
    return `${prefix}${suffix}`;
  }
}

export class UlidIdGenerator implements IdGenerator {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  generate(prefix: IdPrefix): string {
    return `${prefix}${createUlid(this.clock.now())}`;
  }
}

function createUlid(date: Date): string {
  return `${encodeTime(date.getTime())}${encodeRandom()}`;
}

function encodeTime(timeMs: number): string {
  let value = Math.max(0, Math.floor(timeMs));
  let output = "";

  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD_BASE32[value % 32] + output;
    value = Math.floor(value / 32);
  }

  return output;
}

function encodeRandom(): string {
  const bytes = randomBytes(16);
  let output = "";

  for (let index = 0; index < 16; index += 1) {
    output += CROCKFORD_BASE32[bytes[index] & 31];
  }

  return output;
}
