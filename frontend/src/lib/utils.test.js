import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-2 py-1", "bg-blue-500");
    expect(result).toContain("px-2");
    expect(result).toContain("py-1");
    expect(result).toContain("bg-blue-500");
  });

  it("should handle falsy values", () => {
    const isHidden = false;
    const result = cn("px-2", isHidden && "hidden", null, undefined, "text-white");
    expect(result).toBe("px-2 text-white");
  });

  it("should resolve conflicts using tailwind-merge", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });
});
