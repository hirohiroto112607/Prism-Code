import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom";

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup();
});
