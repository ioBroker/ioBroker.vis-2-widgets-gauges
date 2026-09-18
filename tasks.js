/*
 * Build of the vis-2 widget set.
 *
 * `widgets/` is generated completely: the widget set lives in `widgets/vis-2-widgets-gauges/` and nothing else is
 * shipped there. The federation manifest (`mf-manifest.json`) is copied too - vis-2 reads it to decide whether a
 * widget set was built for its react version.
 */
const { deleteFoldersRecursive, buildReact, npmInstall, copyFiles } = require('@iobroker/build-tools');

/** Where the built widget set ends up. Must match `common.visWidgets.*.url` in io-package.json. */
const TARGET = 'widgets/vis-2-widgets-gauges';

function copyAllFiles() {
    copyFiles(['src-widgets/build/**/*', '!src-widgets/build/index.html'], `${TARGET}/`);
}

if (process.argv.includes('--copy-files')) {
    copyAllFiles();
} else if (process.argv.includes('--build')) {
    buildReact(`${__dirname}/src-widgets`, { rootDir: __dirname, vite: true }).catch(e => {
        console.error(`Error by build: ${e}`);
        process.exit(1);
    });
} else {
    deleteFoldersRecursive(`${__dirname}/src-widgets/build`);
    deleteFoldersRecursive(`${__dirname}/widgets`);
    npmInstall('src-widgets')
        .then(() => buildReact(`${__dirname}/src-widgets`, { rootDir: __dirname, vite: true }))
        .then(() => copyAllFiles())
        .catch(e => {
            console.error(`Error by build: ${e}`);
            process.exit(1);
        });
}
