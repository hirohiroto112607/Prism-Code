import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // 拡張機能のルートディレクトリ
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // テストを実行するファイル
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // VSCodeをダウンロードし、テストを実行
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--disable-extensions"], // 他の拡張機能を無効化
      version: "insiders", // VSCode Insidersを使用
    });
  } catch (err) {
    console.error("テストの実行に失敗しました:", err);
    process.exit(1);
  }
}

main();
