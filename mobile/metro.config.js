// Explicit default config — Expo SDK 50+ already resolves the `@/*` alias
// from tsconfig.json's "paths" automatically, but this file keeps that
// behaviour pinned rather than implicit.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
