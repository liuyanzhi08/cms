const mode = process.env.NODE_ENV;
const isDev = mode === 'development';
const isPrd = mode === 'production';

export default {
  mode,
  isDev,
  isPrd,
};
