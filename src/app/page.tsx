"use client";

import Image from "next/image";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-dark.css";
import { use, useEffect, useState } from "react";
import * as t from "@babel/types";

import { default as traverse } from "@babel/traverse";
import { parse } from "@babel/parser";
import { default as generate } from "@babel/generator";
const RNStyleProperties = [
  "alignContent",
  "alignItems",
  "alignSelf",
  "aspectRatio",
  "backfaceVisibility",
  "backgroundColor",
  "borderBottomColor",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomWidth",
  "borderColor",
  "borderLeftColor",
  "borderLeftWidth",
  "borderRadius",
  "borderRightColor",
  "borderRightWidth",
  "borderStyle",
  "borderTopColor",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopWidth",
  "borderWidth",
  "bottom",
  "color",
  "decomposedMatrix",
  "direction",
  "display",
  "elevation",
  "flex",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrap",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "height",
  "includeFontPadding",
  "justifyContent",
  "left",
  "letterSpacing",
  "lineHeight",
  "margin",
  "marginBottom",
  "marginHorizontal",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginVertical",
  "maxHeight",
  "maxWidth",
  "minHeight",
  "minWidth",
  "opacity",
  "overflow",
  "overlayColor",
  "padding",
  "paddingBottom",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingVertical",
  "position",
  "resizeMode",
  "right",
  "rotation",
  "scaleX",
  "scaleY",
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "textAlign",
  "textAlignVertical",
  "textDecorationColor",
  "textDecorationLine",
  "textDecorationStyle",
  "textShadowColor",
  "textShadowOffset",
  "textShadowRadius",
  "tintColor",
  "top",
  "transform",
  "transformMatrix",
  "translateX",
  "translateY",
  "width",
  "writingDirection",
  "zIndex",
];
function transformCode(code: string, CONFIG: any) {
  let importName = "react-native-ustyle";
  let importedComponents = [];
  let styleId = 0;
  let Styles = [];
  let styleExpression = [];
  function resolver(name) {
    if (name in CONFIG) {
      return CONFIG[name];
    }

    return name;
  }
  function checkIfStylesheetImportedAndImport(programPath) {
    let importDeclaration = programPath.node.body.find(
      (node) =>
        node.type === "ImportDeclaration" &&
        node.source.value === "react-native"
    );
    if (importDeclaration) {
      // delete the old importspecifier
      // importDeclaration.specifiers = importDeclaration.specifiers.filter(
      //   (specifier) => specifier.imported.name !== "StyleSheet"
      // );
      // programPath.node.body.unshift(
      //   t.importDeclaration(
      //     [
      //       t.importSpecifier(
      //         t.identifier("StyleSheet"),
      //         t.identifier("StyleSheet")
      //       ),
      //     ],
      //     t.stringLiteral("react-native")
      //   )
      // );
    }
  }
  function attributesToObject(attributes) {
    if (!Array.isArray(attributes)) {
      throw new TypeError("Expected attributes to be an array");
    }

    const obj = {};
    attributes.forEach((attribute) => {
      const key = resolver(attribute.name.name);
      let value;
      if (attribute.value.type === "JSXExpressionContainer") {
        if (attribute.value.expression.type === "ObjectExpression") {
          value = {};
          attribute.value.expression.properties.forEach((prop) => {
            const propName =
              prop.key.type === "StringLiteral"
                ? prop.key.value
                : prop.key.name;
            if (prop.value.value !== undefined) {
              value[propName] = prop.value.value;
            }
          });
        } else {
          value = attribute.value.expression.value;
        }
      } else if (attribute.value.type === "JSXElement") {
        value = attributesToObject(attribute.value.openingElement.attributes);
      } else {
        value = attribute.value.value;
      }

      if (value !== undefined) {
        obj[key] = value;
      }
    });
    return obj;
  }
  function addRnuStyleIdInStyleArrayOfCOmponent(jsxAttrArray, styleId) {
    // find the style attribute
    let styleAttr = jsxAttrArray.find((attr) => attr.name.name === "style");
    // insert the styleId in the style array
    // style can be an array or a single object
    if (styleAttr) {
      // if the style attribute is a single object then convert it to an array
      if (styleAttr.value.expression.type !== "ArrayExpression") {
        styleAttr.value.expression = t.arrayExpression([
          styleAttr.value.expression,
        ]);
      }
      let styleArray = styleAttr.value.expression.elements;
      styleArray.push(t.identifier("rnuStyles.styles" + styleId));
    } else {
      // create a new style attribute
      jsxAttrArray.push(
        t.jsxAttribute(
          t.jsxIdentifier("style"),
          t.jsxExpressionContainer(
            t.arrayExpression([t.identifier("rnuStyles.styles" + styleId)])
          )
        )
      );
    }
  }
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (e) {
    console.error("AST PARSING ERROR", e);
  }
  try {
    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value === importName) {
          path.traverse({
            ImportSpecifier(path) {
              importedComponents.push(path.node.local.name);
            },
          });
          path.node.source.value = "react-native";
        }
      },
      JSXOpeningElement(path) {
        if (importedComponents.includes(path.node.name.name)) {
          // Create a variable declaration for the object
          addRnuStyleIdInStyleArrayOfCOmponent(path.node.attributes, styleId);
          styleExpression.push(
            t.objectProperty(
              t.identifier("styles" + styleId++),
              t.valueToNode(attributesToObject(path.node.attributes))
            )
          );
          // check if rnuStyles is already declared
          let declaration = ast.program.body.find(
            (node) =>
              node.type === "VariableDeclaration" &&
              node.declarations[0].id.name === "rnuStyles"
          );
          if (declaration) {
            ast.program.body = ast.program.body.filter(
              (node) =>
                node.type !== "VariableDeclaration" ||
                node.declarations[0].id.name !== "rnuStyles"
            );
          } else {
            declaration = t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier("rnuStyles"),
                // Not using StyleSheet.create since it is not working in the latest metro version
                // t.callExpression(t.identifier("StyleSheet.create"), [
                t.objectExpression(styleExpression)
                // ])
              ),
            ]);
          }
          Styles.push(declaration);
          ast.program.body.push(declaration);
        }
      },
      Program(path) {
        checkIfStylesheetImportedAndImport(path);
      },
    });
  } catch (e) {
    console.error(e);
  }
  return generate(ast).code;
}

function KeyValueInput({ alias, value, onValueChange, onAliasChange }) {
  return (
    <div className="flex flex-row gap-2 items-center">
      <input
        placeholder="alias"
        onChange={(e) => onAliasChange(e.target.value)}
        className="text-gray-300 bg-slate-800 p-2  rounded"
        type="text"
        value={alias}
      />
      :
      <select
        onChange={(e) => onValueChange(e.target.value)}
        value={value ?? "Select a Property"}
        className="text-gray-300 bg-slate-800 p-2  rounded"
      >
        <option disabled value="Select a Property">
          Select a Property
        </option>
        {RNStyleProperties.map((prop) => {
          return <option value={prop}>{prop}</option>;
        })}
      </select>
    </div>
  );
}

export default function Home() {
  const [inputCode, setInputCode] = useState(
    `import React from 'react';
import { Text, View } from 'react-native-ustyle';

export default function App() {
  return (
    <View bg="yellow" p={20} mx={20}>
      <Text c="blue">Open up App.js to start working on your app!</Text>
    </View>
  );
}   
`
  );
  const [config, setConfig] = useState({
    p: "padding",
    m: "margin",
    t: "top",
    b: "bottom",
    l: "left",
    r: "right",
    h: "height",
    w: "width",
    bg: "backgroundColor",
    c: "color",
    mx: "marginHorizontal",
    bc: "borderColor",
    bw: "borderWidth",
    mr: "marginRight",
  });
  const [activeFile, setActiveFile] = useState("app");
  const [newAlias, setNewAlias] = useState({
    alias: "",
    value: "Select a Property",
  });
  const [code, setCode] = useState(`function add(a, b) {\n  return a + b;\n}`);
  return (
    <main className="flex h-screen flex-row items-center justify-between lg:p-24 p-2 gap-2">
      <div className="flex flex-col h-full flex-1 border-white rounded-md border overflow-hidden">
        <div className="flex flex-row border-b-2">
          <div
            onClick={() => setActiveFile("app")}
            className={
              activeFile === "app"
                ? "cursor-pointer px-4 py-2 bg-gray-700"
                : "cursor-pointer px-4 py-2 bg-gray-900"
            }
          >
            App.tsx
          </div>
          <div
            onClick={() => setActiveFile("config")}
            className={
              activeFile === "config"
                ? "cursor-pointer px-4 py-2 bg-gray-700"
                : "cursor-pointer px-4 py-2 bg-gray-900"
            }
          >
            rnu.config.ts
          </div>
        </div>
        {activeFile === "app" ? (
          <Editor
            value={inputCode}
            onValueChange={(code) => {
              setInputCode(code);
              setCode(code);
            }}
            highlight={(code) => highlight(code, languages.js)}
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 12,
              width: "100%",
              height: "100%",
              overflow: "scroll",
            }}
          />
        ) : (
          <div className="overflow-scroll gap-4 flex flex-col  items-center py-10">
            <div className="flex gap-4 ">
              <KeyValueInput
                alias={newAlias.alias}
                onAliasChange={(val) => {
                  setNewAlias({ ...newAlias, alias: val });
                }}
                value={newAlias.value}
                onValueChange={(val) => {
                  setNewAlias({ ...newAlias, value: val });
                }}
              />
              <button
                onClick={() => {
                  setConfig({ ...config, [newAlias.alias]: newAlias.value });
                  setNewAlias({ alias: "", value: "" });
                }}
                className="bg-gray-700 p-2 rounded"
              >
                Add
              </button>
            </div>
            {Object.keys(config).map((key, ind) => {
              return (
                <div>
                  <KeyValueInput
                    alias={key}
                    onAliasChange={(val) => {
                      let newConfig = { ...config };
                      newConfig[val] = newConfig[key];
                      delete newConfig[key];
                      setConfig(newConfig);
                    }}
                    value={config[key]}
                    onValueChange={(val) => {
                      setConfig({ ...config, [key]: val });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex h-full flex-1 border-white rounded-md border overflow-hidden">
        <Editor
          value={transformCode(inputCode, config)}
          onValueChange={() => {}}
          highlight={(code) => highlight(code, languages.js)}
          padding={10}
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',

            fontSize: 12,
            width: "100%",
          }}
        />
      </div>
    </main>
  );
}
