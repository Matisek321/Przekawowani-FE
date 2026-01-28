import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should handle false conditional classes", () => {
    const isActive = false;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class");
  });

  it("should merge Tailwind classes correctly", () => {
    const result = cn("px-4 py-2", "px-6");
    expect(result).toBe("py-2 px-6");
  });

  it("should handle undefined and null values", () => {
    const result = cn("base-class", undefined, null, "another-class");
    expect(result).toBe("base-class another-class");
  });

  it("should handle empty strings", () => {
    const result = cn("", "class-a", "", "class-b");
    expect(result).toBe("class-a class-b");
  });
});
