import { describe, expect, it } from "vitest";

import { greet } from "../src/index.js";

describe("greet", () => {
  it("greets a name", () => {
    expect(greet("Ada")).toBe("Hello, Ada!");
  });
});
