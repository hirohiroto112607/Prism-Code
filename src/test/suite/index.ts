import * as path from "path";
import Mocha from "mocha";
import { glob } from "glob";

export function run(): Promise<void> {
  // Mochaテストランナーを作成
  const mocha = new Mocha({
    ui: "bdd",
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname, ".");

  return new Promise((resolve, reject) => {
    // テストファイルを検索
    glob("**/**.test.js", { cwd: testsRoot })
      .then((files) => {
        // 各テストファイルをMochaに追加
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // テストを実行
          mocha.run((failures) => {
            if (failures > 0) {
              reject(new Error(`${failures}個のテストが失敗しました`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error(err);
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}
