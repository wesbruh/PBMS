module.exports = function jestImportMetaEnvPlugin({ types: t }) {
  return {
    name: "jest-import-meta-env",
    visitor: {
      MemberExpression(path) {
        if (!path.node.computed && path.node.property.name === "env") {
          const metaProperty = path.node.object;

          if (
            t.isMetaProperty(metaProperty) &&
            metaProperty.meta.name === "import" &&
            metaProperty.property.name === "meta"
          ) {
            path.replaceWith(
              t.memberExpression(t.identifier("process"), t.identifier("env"))
            );
          }
        }
      },
    },
  };
};
