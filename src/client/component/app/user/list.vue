<template>
  <component :is="listThemeComponent" />
</template>
<script>
import Vue from 'vue';
import { CATEGORY_FETCH, THEME_SET } from '../../../store';
import { err } from '../../../helper/logger';
import config from '../../../config';

const { pagination } = config;

export default {
  async asyncData({ store, route }) {
    const { id } = route.params;
    let { _page, _num } = route.query;
    if (!_page) {
      _page = pagination.page;
    }

    if (!_num) {
      _num = pagination.num;
    }

    const _from = (_page - 1) * _num;
    const _size = _num;

    await store.dispatch(CATEGORY_FETCH, { id, article: `${_from},${_size}` });

    let theme = store.getters.listTheme[id];
    if (!theme) {
      theme = store.getters.categories[id].theme || 'default';
      store.dispatch(THEME_SET, { list: { [id]: theme } });
    }
    let themeComponent;
    try {
      themeComponent = (await import(`../../../theme/${theme}/list.vue`)).default;
    } catch (e) {
      const configTheme = config.theme;
      themeComponent = (await import(`../../../theme/${configTheme}/list.vue`)).default;
    }
    if (themeComponent.asyncData) {
      try {
        await themeComponent.asyncData({ store, route });
      } catch (e) {
        err(e);
      }
    }
    Vue.component(`vms-list-${id}`, themeComponent);
  },
  computed: {
    listThemeComponent() {
      return `vms-list-${this.$store.state.route.params.id}`;
    },
  },
};
</script>
