import path from 'path';
import webpack from 'webpack';
import MFS from 'memory-fs';
import webpackHotMiddleware from 'webpack-hot-middleware';
import e2k from 'express-to-koa';
import webpackDevMiddleware from 'webpack-dev-middleware';
import clientConfig from './webpack/dev/ssr.client.config.babel';
import serverConfig from './webpack/dev/ssr.server.config.babel';

const readFile = (fs, file) => {
  try {
    return fs.readFileSync(path.join(clientConfig.output.path, file));
  } catch (e) {
    return e;
  }
};

export default async function setupDevServer(app) {
  let clientManifest;
  let serverManifest;
  let readClientFile;
  let readServerFile;

  let resolve;
  const readyPromise = new Promise((r) => { resolve = r; });
  const ready = () => {
    resolve({
      readClientFile,
      readServerFile,
    });
  };

  // modify client config to work with hot middleware
  const clientConfigClone = Object.assign({}, clientConfig);
  clientConfigClone.entry.index = ['webpack-hot-middleware/client', clientConfig.entry.index];
  clientConfigClone.output.filename = '[name].js';
  clientConfigClone.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  );

  // dev middleware
  const clientCompiler = webpack(clientConfigClone);
  const devMiddleware = webpackDevMiddleware(clientCompiler, {
    publicPath: clientConfigClone.output.publicPath,
    stats: 'minimal',
  });

  readClientFile = (filename, raw) => {
    const buffer = readFile(devMiddleware.fileSystem, filename);
    return raw ? buffer : buffer.toString();
  };

  clientCompiler.plugin('done', (res) => {
    const stats = res.toJson();
    stats.errors.forEach(err => console.error(err));
    stats.warnings.forEach(err => console.warn(err));
    if (stats.errors.length) return;

    clientManifest = JSON.parse(readFile(
      devMiddleware.fileSystem,
      'manifest/vue-ssr-client-bundle.json',
    ));
    if (serverManifest) {
      ready();
    }
  });

  // hot middleware
  app.use(e2k(webpackHotMiddleware(clientCompiler, { heartbeat: 5000 })));

  // watch and update server renderer
  const serverCompiler = webpack(serverConfig);
  const mfs = new MFS();
  serverCompiler.outputFileSystem = mfs;
  serverCompiler.watch({}, (err, res) => {
    if (err) throw err;
    const stats = res.toJson();
    if (stats.errors.length) return;

    // read bundle generated by vue-ssr-webpack-plugin
    serverManifest = JSON.parse(readFile(mfs, 'manifest/vue-ssr-server-bundle.json'));
    if (clientManifest) {
      ready();
    }
    readServerFile = (filename, raw) => {
      const buffer = readFile(mfs, filename);
      return raw ? buffer : buffer.toString();
    };
  });

  return readyPromise;
};
