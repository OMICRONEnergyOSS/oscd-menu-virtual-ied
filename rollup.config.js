import base from '@omicronenergy/oscd-tooling/configs/rollup.config.js';

const plugins = ['virtual-template-ied'];

export default [
  ...plugins.map(name => ({
    ...base[0],
    input: `src/${name}.ts`,
  })),
  ...base.slice(1),
];
