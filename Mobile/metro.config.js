const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force every `import ... from 'three'` to share one module instance.
// Without this, Metro can resolve `three` to different build files (e.g. after
// toggling package exports), which breaks WebGL buffers and shows white line spikes.
const THREE_ENTRY = path.resolve(__dirname, 'node_modules/three/build/three.module.js');

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ENTRY };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
