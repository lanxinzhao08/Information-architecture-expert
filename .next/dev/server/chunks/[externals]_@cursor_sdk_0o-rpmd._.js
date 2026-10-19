module.exports = [
"[externals]/@cursor/sdk [external] (@cursor/sdk, esm_import, [project]/node_modules/@cursor/sdk, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_@cursor_sdk_1y1p7iv._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/@cursor/sdk [external] (@cursor/sdk, esm_import, [project]/node_modules/@cursor/sdk)");
    });
});
}),
];