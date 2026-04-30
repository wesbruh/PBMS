module.exports = {
  presets: [
    "@babel/preset-env",
    ["@babel/preset-react", { runtime: "automatic" }],
    ["babel-preset-vite", { env: true }]
  ],
  plugins: ['babel-plugin-transform-import-meta']
};

// export default {
//   presets: [
//     ["@babel/preset-env", { targets: { node: "current" } }],
//     ["@babel/preset-react", { runtime: "automatic" }],
//   ],
  
// };