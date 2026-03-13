import { expect } from "chai";
import { IRTransformer } from "../../core/transformer/IRTransformer";
import type { AST } from "../../core/parser/AST";
import type {
  IRStartNode,
  IRProcessNode,
  IRControlFlowNode,
} from "../../core/ir/IR";

describe("IRTransformer", () => {
  let transformer: IRTransformer;

  beforeEach(() => {
    transformer = new IRTransformer();
  });

  const defaultLocation = {
    start: { line: 1, column: 0 },
    end: { line: 1, column: 10 },
  };

  const defaultMetadata = {
    language: "typescript",
    file: "test.ts",
  };

  describe("transform", () => {
    it("空のASTを変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [],
      };

      const result = transformer.transform(ast, defaultMetadata);

      expect(result.version).to.equal("1.0.0");
      expect(result.metadata.sourceLanguage).to.equal("typescript");
      expect(result.metadata.sourceFile).to.equal("test.ts");
      expect(result.nodes).to.have.lengthOf(0);
      expect(result.edges).to.have.lengthOf(0);
    });

    it("シンプルな変数宣言を含む関数を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testFunc",
            parameters: [],
            body: [
              {
                type: "VariableDeclaration",
                name: "x",
                varType: "number",
                initializer: "10",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード数: start(1) + variable(1) + end(1) = 3
      expect(result.nodes).to.have.lengthOf(3);
      expect(result.nodes[0].type).to.equal("start");

      const startNode = result.nodes[0] as IRStartNode;
      expect(startNode.label).to.include("testFunc");

      expect(result.nodes[1].type).to.equal("variable");
      expect(result.nodes[2].type).to.equal("end");

      // エッジ数: start→variable + variable→end = 2
      expect(result.edges).to.have.lengthOf(2);
      expect(result.edges[0].source).to.equal("node_0"); // start
      expect(result.edges[0].target).to.equal("node_1"); // variable
      expect(result.edges[1].source).to.equal("node_1"); // variable
      expect(result.edges[1].target).to.equal("node_2"); // end
    });

    it("Return文を含む関数を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "getValue",
            parameters: [],
            body: [
              {
                type: "ReturnStatement",
                value: "42",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      expect(result.nodes).to.have.lengthOf(3);
      expect(result.nodes[1].type).to.equal("return");

      const returnNode = result.nodes[1] as IRProcessNode;
      expect(returnNode.label).to.equal("return 42");
    });
  });

  describe("If文の変換", () => {
    it("then分岐のみのIf文を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testIf",
            parameters: [],
            body: [
              {
                type: "IfStatement",
                condition: "x > 0",
                thenBranch: [
                  {
                    type: "VariableDeclaration",
                    name: "y",
                    initializer: "1",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + if + variable(then) + end = 4
      expect(result.nodes).to.have.lengthOf(4);

      const ifNode = result.nodes.find(
        (n) => n.type === "if",
      ) as IRControlFlowNode;
      expect(ifNode).to.exist;
      expect(ifNode.condition).to.equal("x > 0");

      // エッジ: start→if, if→variable(true), variable→end, if→end = 4
      expect(result.edges.length).to.be.greaterThanOrEqual(3);

      // "true"ラベルのエッジが存在するか確認
      const trueEdge = result.edges.find((e) => e.label === "true");
      expect(trueEdge).to.exist;
    });

    it("then + else分岐を持つIf文を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testIfElse",
            parameters: [],
            body: [
              {
                type: "IfStatement",
                condition: "x > 0",
                thenBranch: [
                  {
                    type: "VariableDeclaration",
                    name: "y",
                    initializer: "1",
                    location: defaultLocation,
                  },
                ],
                elseBranch: [
                  {
                    type: "VariableDeclaration",
                    name: "y",
                    initializer: "-1",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + if + variable(then) + variable(else) + end = 5
      expect(result.nodes).to.have.lengthOf(5);

      // "true"と"false"ラベルのエッジが存在するか確認
      const trueEdge = result.edges.find((e) => e.label === "true");
      const falseEdge = result.edges.find((e) => e.label === "false");
      expect(trueEdge).to.exist;
      expect(falseEdge).to.exist;
    });
  });

  describe("ループの変換", () => {
    it("Forループを変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testFor",
            parameters: [],
            body: [
              {
                type: "ForStatement",
                initializer: "let i = 0",
                condition: "i < 10",
                incrementor: "i++",
                body: [
                  {
                    type: "ExpressionStatement",
                    expression: "console.log(i)",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + for + expression + end = 4
      expect(result.nodes).to.have.lengthOf(4);

      const forNode = result.nodes.find(
        (n) => n.type === "for",
      ) as IRControlFlowNode;
      expect(forNode).to.exist;
      expect(forNode.condition).to.equal("i < 10");

      // ループバックエッジが存在するか確認
      const loopEdge = result.edges.find((e) => e.label === "ループ");
      expect(loopEdge).to.exist;

      // "ループ継続"ラベルのエッジが存在するか確認
      const continueEdge = result.edges.find((e) => e.label === "ループ継続");
      expect(continueEdge).to.exist;
    });

    it("Whileループを変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testWhile",
            parameters: [],
            body: [
              {
                type: "WhileStatement",
                condition: "x < 100",
                body: [
                  {
                    type: "VariableDeclaration",
                    name: "x",
                    initializer: "x + 1",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + while + variable + end = 4
      expect(result.nodes).to.have.lengthOf(4);

      const whileNode = result.nodes.find(
        (n) => n.type === "while",
      ) as IRControlFlowNode;
      expect(whileNode).to.exist;
      expect(whileNode.condition).to.equal("x < 100");

      // ループバックエッジが存在するか確認
      const loopEdge = result.edges.find((e) => e.label === "ループ");
      expect(loopEdge).to.exist;
    });

    it("ループ終了後のエッジに正しいラベルが付くべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "testLoopEnd",
            parameters: [],
            body: [
              {
                type: "ForStatement",
                condition: "i < 10",
                body: [
                  {
                    type: "ExpressionStatement",
                    expression: "i++",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
              {
                type: "ReturnStatement",
                value: "i",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // "ループ終了"ラベルのエッジが存在するか確認
      const loopEndEdge = result.edges.find((e) => e.label === "ループ終了");
      expect(loopEndEdge).to.exist;
    });
  });

  describe("複雑な制御フロー", () => {
    it("ネストされたIf文を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "nestedIf",
            parameters: [],
            body: [
              {
                type: "IfStatement",
                condition: "x > 0",
                thenBranch: [
                  {
                    type: "IfStatement",
                    condition: "y > 0",
                    thenBranch: [
                      {
                        type: "ReturnStatement",
                        value: "1",
                        location: defaultLocation,
                      },
                    ],
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + if(outer) + if(inner) + return + end = 5
      expect(result.nodes).to.have.lengthOf(5);

      const ifNodes = result.nodes.filter((n) => n.type === "if");
      expect(ifNodes).to.have.lengthOf(2);
    });

    it("If文とループの組み合わせを変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "complexFlow",
            parameters: [],
            body: [
              {
                type: "IfStatement",
                condition: "x > 0",
                thenBranch: [
                  {
                    type: "ForStatement",
                    condition: "i < x",
                    body: [
                      {
                        type: "ExpressionStatement",
                        expression: "sum += i",
                        location: defaultLocation,
                      },
                    ],
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
              {
                type: "ReturnStatement",
                value: "sum",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + if + for + expression + return + end = 6
      expect(result.nodes).to.have.lengthOf(6);

      const ifNode = result.nodes.find((n) => n.type === "if");
      const forNode = result.nodes.find((n) => n.type === "for");
      const returnNode = result.nodes.find((n) => n.type === "return");

      expect(ifNode).to.exist;
      expect(forNode).to.exist;
      expect(returnNode).to.exist;
    });
  });

  describe("エッジケース", () => {
    it("空の関数本体を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "emptyFunc",
            parameters: [],
            body: [],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + end = 2
      expect(result.nodes).to.have.lengthOf(2);

      // エッジ: start→end = 1
      expect(result.edges).to.have.lengthOf(1);
    });

    it("空のthen分岐を持つIf文を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "emptyThen",
            parameters: [],
            body: [
              {
                type: "IfStatement",
                condition: "x > 0",
                thenBranch: [],
                elseBranch: [
                  {
                    type: "ReturnStatement",
                    value: "0",
                    location: defaultLocation,
                  },
                ],
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: start + if + return(else) + end = 4
      expect(result.nodes).to.have.lengthOf(4);

      const ifNode = result.nodes.find((n) => n.type === "if");
      expect(ifNode).to.exist;
    });

    it("複数の関数を変換できるべき", () => {
      const ast: AST = {
        type: "Program",
        body: [
          {
            type: "FunctionDeclaration",
            name: "func1",
            parameters: [],
            body: [
              {
                type: "ReturnStatement",
                value: "1",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
          {
            type: "FunctionDeclaration",
            name: "func2",
            parameters: [],
            body: [
              {
                type: "ReturnStatement",
                value: "2",
                location: defaultLocation,
              },
            ],
            location: defaultLocation,
          },
        ],
      };

      const result = transformer.transform(ast, defaultMetadata);

      // ノード: (start + return + end) * 2 = 6
      expect(result.nodes).to.have.lengthOf(6);

      const startNodes = result.nodes.filter((n) => n.type === "start");
      expect(startNodes).to.have.lengthOf(2);
    });
  });
});
