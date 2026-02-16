import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup();
});
