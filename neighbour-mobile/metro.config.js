const path = require("path");
const {getDefaultConfig} = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve(
    "react-native-svg-transformer"
);

config.resolver.assetExts = config.resolver.assetExts.filter(
    (ext) => ext !== "svg"
);
config.resolver.sourceExts.push("svg");

// Lottie support
config.resolver.assetExts.push("lottie");

// Browser preview only (`npm run preview`): native-only modules get a stand-in so screens can be
// checked against Figma in a browser. Phone builds never take this branch.
const webShims = {
    "react-native-maps": path.resolve(__dirname, "dev/web-preview/react-native-maps.tsx"),
    "expo-secure-store": path.resolve(__dirname, "dev/web-preview/expo-secure-store.ts"),
    "lottie-react-native": path.resolve(__dirname, "dev/web-preview/lottie-react-native.tsx"),
    "react-native-pager-view": path.resolve(__dirname, "dev/web-preview/react-native-pager-view.tsx"),
};
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === "web" && webShims[moduleName]) {
        return {type: "sourceFile", filePath: webShims[moduleName]};
    }
    return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
