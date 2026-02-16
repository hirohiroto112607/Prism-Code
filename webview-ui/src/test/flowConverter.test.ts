import { describe, it, expect } from "vitest";
import { convertIRToReactFlow } from "../utils/flowConverter";
import type { IR } from "../types/ir";

describe("flowConverter", () => {
  describe("convertIRToReactFlow", () => {
    const defaultMetadata = {
      sourceLanguage: "typescript",
      sourceFile: "test.ts",
      timestamp: Date.now(),
    };

    const defaultLocation = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 10 },
    };

    it("空のIRを変換できるべき", () => {
      const ir: IR = {
        nodes: [],
        edges: [],
        version: "1.0",
        metadata: defaultMetadata,
      };

      const result = convertIRToReactFlow(ir);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it("開始ノードを正しく変換できるべき", () => {
      const ir: IR = {
        nodes: [
          {
            id: "node_0",
            type: "start",
            label: "関数開始: testFunction",
          },
        ],
        edges: [],
        version: "1.0",
        metadata: defaultMetadata,
      };

      const result = convertIRToReactFlow(ir);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe("node_0");
      expect(result.nodes[0].type).toBe("start");
      expect(result.nodes[0].data.label).toBe("関数開始: testFunction");
    });

    it("エッジを正しく変換できるべき", () => {
      const ir: IR = {
        nodes: [
          {
            id: "node_0",
            type: "start",
            label: "開始",
          },
          {
            id: "node_1",
            type: "end",
            label: "終了",
          },
        ],
        edges: [
          {
            id: "edge_0",
            source: "node_0",
            target: "node_1",
            type: "control",
          },
        ],
        version: "1.0",
        metadata: defaultMetadata,
      };

      const result = convertIRToReactFlow(ir);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].id).toBe("edge_0");
      expect(result.edges[0].source).toBe("node_0");
      expect(result.edges[0].target).toBe("node_1");
      expect(result.edges[0].type).toBe("smoothstep");
    });

    it("複数のノードとエッジを変換できるべき", () => {
      const ir: IR = {
        nodes: [
          {
            id: "node_0",
            type: "start",
            label: "開始",
          },
          {
            id: "node_1",
            type: "variable",
            label: "let x = 10",
            location: defaultLocation,
          },
          {
            id: "node_2",
            type: "end",
            label: "終了",
          },
        ],
        edges: [
          {
            id: "edge_0",
            source: "node_0",
            target: "node_1",
            type: "control",
          },
          {
            id: "edge_1",
            source: "node_1",
            target: "node_2",
            type: "control",
          },
        ],
        version: "1.0",
        metadata: defaultMetadata,
      };

      const result = convertIRToReactFlow(ir);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });
  });
});
