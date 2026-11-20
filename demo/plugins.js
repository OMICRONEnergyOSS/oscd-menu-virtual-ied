import OscdMenuOpen from '@omicronenergy/oscd-menu-open';
import OscdMenuSave from '@omicronenergy/oscd-menu-save';

import VirtualTemplateIed from '../dist/virtual-template-ied.js';

const shell = document.querySelector('oscd-shell');
if (!shell?.registry) {
  throw new Error('Cannot register demo plugins: oscd-shell registry not found');
}

shell.registry.define('oscd-menu-open', OscdMenuOpen);
shell.registry.define('oscd-menu-save', OscdMenuSave);
shell.registry.define('virtual-template-ied', VirtualTemplateIed);

export const plugins = {
  menu: [
    {
      name: 'Open File',
      icon: 'folder_open',
      tagName: 'oscd-menu-open',
    },
    {
      name: 'Save File',
      icon: 'save',
      requireDoc: true,
      tagName: 'oscd-menu-save',
    },
    {
      name: 'Create Virtual IED',
      icon: 'developer_board',
      requireDoc: true,
      tagName: 'virtual-template-ied',
    },
  ],
  editor: [
    {
      name: 'Source Editor',
      icon: 'data_object',
      requireDoc: true,
      src: 'https://omicronenergyoss.github.io/oscd-editor-source/oscd-editor-source.js',
    },
  ],
};
