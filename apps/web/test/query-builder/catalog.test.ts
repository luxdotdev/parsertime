import {
  buildCatalogIndex,
  buildDatasetCatalog,
} from "@/lib/query-builder/catalog";
import { DATASETS } from "@/lib/query-builder/types";
import { describe, expect, it } from "vitest";

describe("query-builder catalog", () => {
  it("indexes every dataset with a description and kind", () => {
    const index = buildCatalogIndex();
    expect(index).toHaveLength(DATASETS.length);
    for (const entry of index) {
      expect(entry.description.length).toBeGreaterThan(0);
      expect(["sql", "computed"]).toContain(entry.kind);
    }
  });

  it("builds a field catalog whose metrics each allow their default agg", () => {
    const cat = buildDatasetCatalog("player_stat");
    expect(cat.id).toBe("player_stat");
    expect(cat.metrics.length).toBeGreaterThan(0);
    for (const metric of cat.metrics) {
      expect(metric.allowedAggs).toContain(metric.defaultAgg);
    }
  });

  it("classifies each filter's options as enum or dynamic, never both", () => {
    for (const id of DATASETS) {
      for (const f of buildDatasetCatalog(id).filters) {
        expect(typeof f.dynamicOptions).toBe("boolean");
        if (f.dynamicOptions) expect(f.options).toBeUndefined();
      }
    }
  });

  it("shapes every dataset without throwing", () => {
    for (const id of DATASETS) {
      expect(buildDatasetCatalog(id).id).toBe(id);
    }
  });
});
