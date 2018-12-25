import ip from 'ip';
import Core from '../core';
import { isDev } from '../helper/env';
import { log } from '../helper/logger';
import error from '../helper/error';
import { API_SET, AUTH_USER, AUTH_USER_ID } from '../store';
import config from '../../config';

export default async ctx => new Promise((resolve, reject) => {
  const core = new Core();
  const { router, store } = core;

  const start = isDev && Date.now();

  const { url } = ctx;

  const { fullPath } = router.resolve(url).route;

  if (fullPath !== url) {
    return reject(new Error(error.routerNotFound.info));
  }

  // set uri
  store.dispatch(API_SET, `http://${ip.address()}:${config.server.port}`);

  // set auth
  const userId = ctx.cookies.get(AUTH_USER);
  if (userId) {
    store.commit(AUTH_USER_ID, userId);
  }

  const app = core.createApp();

  // wait until router has resolved possible async hooks
  router.onReady(() => {
    const matchedComponents = router.getMatchedComponents();
    // no matched routes
    if (!matchedComponents.length) {
      return reject(new Error(error.routerNotFound.info));
    }

    return Promise.all(matchedComponents.map(({ asyncData }) => {
      const t = asyncData && asyncData({
        store,
        route: router.currentRoute,
      });
      return t;
    })).then(async () => {
      // get asyncData in customer theme component definition
      const typeName = router.currentRoute.matched
        && router.currentRoute.matched.length > 1
        && router.currentRoute.matched[1].name;
      const types = ['index', 'detail', 'list'];
      if (types.indexOf(typeName) !== -1) {
        let themeComponent;
        try {
          themeComponent = (await import(`../theme/${store.getters.indexTheme}/${typeName}.vue`)).default;
        } catch (e) {
          themeComponent = (await import(`../theme/default/${typeName}.vue`)).default;
        }
        const themeAsyncData = themeComponent.asyncData;
        if (themeAsyncData) {
          await themeAsyncData({
            store,
            route: router.currentRoute,
          });
        }
      }

      if (isDev) {
        log(`ssr: data pre-fetch: ${Date.now() - start}ms`);
      }
      ctx.state = store.state;
      resolve(app);
    }).catch(reject);
  }, reject);

  // set router's location
  if (isDev) {
    log(url);
  }
  router.push(url);

  return app;
});
