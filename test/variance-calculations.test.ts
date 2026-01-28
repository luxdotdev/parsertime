import {
  calculateMean,
  calculateStandardDeviation,
} from "@/lib/distribution-utils";
import { describe, expect, it } from "vitest";

describe("Variance and Standard Deviation Calculations", () => {
  describe("calculateMean", () => {
    it("should calculate mean of positive numbers", () => {
      const values = [10, 20, 30, 40, 50];
      expect(calculateMean(values)).toBe(30);
    });

    it("should handle single value", () => {
      const values = [42];
      expect(calculateMean(values)).toBe(42);
    });

    it("should return 0 for empty array", () => {
      const values: number[] = [];
      expect(calculateMean(values)).toBe(0);
    });

    it("should handle decimal values", () => {
      const values = [1.5, 2.5, 3.5];
      expect(calculateMean(values)).toBeCloseTo(2.5);
    });

    it("should handle negative numbers", () => {
      const values = [-10, -20, -30];
      expect(calculateMean(values)).toBe(-20);
    });
  });

  describe("calculateStandardDeviation", () => {
    it("should calculate standard deviation correctly", () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      // Expected std dev: 2
      expect(calculateStandardDeviation(values)).toBeCloseTo(2, 1);
    });

    it("should return 0 for identical values (no variance)", () => {
      const values = [5, 5, 5, 5, 5];
      expect(calculateStandardDeviation(values)).toBe(0);
    });

    it("should return 0 for single value", () => {
      const values = [42];
      expect(calculateStandardDeviation(values)).toBe(0);
    });

    it("should return 0 for empty array", () => {
      const values: number[] = [];
      expect(calculateStandardDeviation(values)).toBe(0);
    });

    it("should handle decimal values", () => {
      const values = [1.5, 2.5, 3.5, 4.5, 5.5];
      // Mean = 3.5, variance = 2, std dev = sqrt(2) ≈ 1.414
      expect(calculateStandardDeviation(values)).toBeCloseTo(1.414, 2);
    });

    it("should calculate high variance correctly", () => {
      const values = [1, 100];
      // Mean = 50.5, variance = 2450.25, std dev ≈ 49.5
      expect(calculateStandardDeviation(values)).toBeCloseTo(49.5, 1);
    });
  });

  describe("Consistency Score Calculation", () => {
    it("should calculate coefficient of variation", () => {
      // CV = (std dev / mean) * 100
      const values = [10, 20, 30, 40, 50];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);
      const cv = (stdDev / mean) * 100;

      expect(mean).toBe(30);
      expect(stdDev).toBeCloseTo(14.14, 1);
      expect(cv).toBeCloseTo(47.14, 1);
    });

    it("should show low CV for consistent performance", () => {
      // Consistent player: small variation
      const values = [18, 19, 20, 19, 18];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);
      const cv = (stdDev / mean) * 100;

      expect(cv).toBeLessThan(10); // Less than 10% variation
    });

    it("should show high CV for inconsistent performance", () => {
      // Inconsistent player: large variation
      const values = [5, 30, 10, 35, 15];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);
      const cv = (stdDev / mean) * 100;

      expect(cv).toBeGreaterThan(50); // More than 50% variation
    });

    it("should handle zero mean gracefully", () => {
      const values = [0, 0, 0];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);

      expect(mean).toBe(0);
      expect(stdDev).toBe(0);
      // CV would be 0/0, should handle this edge case
    });
  });

  describe("Per-10 Statistics Variance", () => {
    it("should calculate variance for per-10 stats", () => {
      // Simulating eliminations per 10 across different maps
      const elimsPer10 = [15.2, 18.6, 14.8, 17.1, 16.3];

      const mean = calculateMean(elimsPer10);
      const stdDev = calculateStandardDeviation(elimsPer10);

      expect(mean).toBeCloseTo(16.4, 1);
      expect(stdDev).toBeCloseTo(1.367, 2);
    });

    it("should identify highly consistent per-10 performance", () => {
      // Very consistent player
      const elimsPer10 = [20.1, 20.3, 19.9, 20.2, 20.0];
      const stdDev = calculateStandardDeviation(elimsPer10);

      expect(stdDev).toBeLessThan(0.2);
    });

    it("should identify highly variable per-10 performance", () => {
      // Very inconsistent player
      const elimsPer10 = [10, 25, 12, 28, 15];
      const stdDev = calculateStandardDeviation(elimsPer10);

      expect(stdDev).toBeGreaterThan(6);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers", () => {
      const values = [1000000, 2000000, 3000000];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);

      expect(mean).toBe(2000000);
      expect(stdDev).toBeCloseTo(816496.58, 0);
    });

    it("should handle very small decimal numbers", () => {
      const values = [0.001, 0.002, 0.003];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);

      expect(mean).toBeCloseTo(0.002, 3);
      expect(stdDev).toBeCloseTo(0.0008, 4);
    });

    it("should handle mix of positive and negative", () => {
      const values = [-5, 0, 5];
      const mean = calculateMean(values);
      const stdDev = calculateStandardDeviation(values);

      expect(mean).toBe(0);
      expect(stdDev).toBeCloseTo(4.08, 1);
    });
  });
});
