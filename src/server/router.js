import KoaRouter from 'koa-router'
import KoaSend from 'koa-send'
import _path from 'path'
import fs from 'fs';
import { adminRoot, userRoot } from "../client/config";
import { path } from "./config";
import log from './helper/log';

var router = new KoaRouter()

router
  .all('/api/:component/:id', componentHandler)
  .all('/api/:component', componentHandler)
  .all('/dist/*', assetHandler)
  .all(adminRoot, indexHandler)
  .all(userRoot, indexHandler)
  .all(`${userRoot}/*`, indexHandler)
  .all(`${adminRoot}/*`, indexHandler)
  .all('*', staticHandle)

async function componentHandler(ctx) {
  try {
    let component = require('./component/' + ctx.params.component).default
    await component[ctx.method.toLowerCase()](ctx)
  } catch (e) {
    console.warn(e);
  }
  log(ctx.url);
}

async function assetHandler(ctx) {
  var filePath = _path.join(path.dist, ctx.params[0]);
  if (fs.existsSync(filePath)) {
    await KoaSend(ctx, filePath, { root: '/'});
  } else {
    ctx.status = 404;
  }
  log(ctx.url);
}

async function indexHandler(ctx) {
  await KoaSend(ctx, _path.join(path.dist, 'index.html'), { root: '/'});
  log(ctx.url);
}

async function staticHandle(ctx) {
  const param = ctx.params[0];
  const file = param !== '/' ? param : '/index.html';
  const filePath = _path.join(path.static, file);
  if (fs.existsSync(filePath)) {
    await KoaSend(ctx, filePath, { root: '/'});
  } else {
    ctx.status = 404;
  }
  log(ctx.url);
}

export default router
