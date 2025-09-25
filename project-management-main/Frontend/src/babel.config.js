// babel.config.js
module.exports = {
    presets: [
      '@babel/preset-env',  // Transpile modern JavaScript
      '@babel/preset-react'  // Transpile JSX
    ],
    plugins: [
      '@babel/plugin-proposal-class-properties'  // Support for class properties
    ]
  };
  