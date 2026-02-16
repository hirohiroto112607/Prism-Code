import { expect } from "chai";
import { ParserFactory } from "../../parsers/ParserFactory";
import { TypeScriptParser } from "../../parsers/typescript/TypeScriptParser";

describe("ParserFactory", () => {
  describe("getParser", () => {
    it("TypeScriptファイルに対してTypeScriptParserを返すべき", () => {
      const parser = ParserFactory.getParser("test.ts");
      expect(parser).to.be.instanceOf(TypeScriptParser);
    });

    it("JavaScriptファイルに対してTypeScriptParserを返すべき", () => {
      const parser = ParserFactory.getParser("test.js");
      expect(parser).to.be.instanceOf(TypeScriptParser);
    });

    it("TSXファイルに対してTypeScriptParserを返すべき", () => {
      const parser = ParserFactory.getParser("component.tsx");
      expect(parser).to.be.instanceOf(TypeScriptParser);
    });

    it("JSXファイルに対してTypeScriptParserを返すべき", () => {
      const parser = ParserFactory.getParser("component.jsx");
      expect(parser).to.be.instanceOf(TypeScriptParser);
    });

    it("サポートされていない拡張子の場合はエラーをスローすべき", () => {
      expect(() => ParserFactory.getParser("test.py")).to.throw(
        "サポートされていないファイル形式です",
      );
    });
  });

  describe("getSupportedExtensions", () => {
    it("サポートされている全ての拡張子を返すべき", () => {
      const extensions = ParserFactory.getSupportedExtensions();
      expect(extensions).to.include(".ts");
      expect(extensions).to.include(".js");
      expect(extensions).to.include(".tsx");
      expect(extensions).to.include(".jsx");
    });
  });

  describe("getGlobPattern", () => {
    it("正しいGlobパターンを返すべき", () => {
      const pattern = ParserFactory.getGlobPattern();
      expect(pattern).to.equal("**/*.{ts,tsx,js,jsx}");
    });
  });
});
