export default {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [
    "./babel-plugin-jest-import-meta-env.cjs",
    "babel-plugin-transform-import-meta",
  ]
};
