import '@webcomponents/scoped-custom-element-registry';

import { expect, fixture, html } from '@open-wc/testing';
import type { EditV2 } from '@openscd/oscd-api';
import { isEditV2, isInsert } from '@openscd/oscd-api/utils.js';
import { OscdSelectionList } from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';

import VirtualTemplateIed from './virtual-template-ied.js';

if (!customElements.get('virtual-template-ied')) {
  customElements.define('virtual-template-ied', VirtualTemplateIed);
}

async function loadDocument(): Promise<XMLDocument> {
  const response = await fetch('/test/testfile/specificfromfunctions.ssd');
  if (!response.ok) {
    throw new Error(`Could not load SCL test fixture: ${response.status}`);
  }

  const text = await response.text();
  return new DOMParser().parseFromString(text, 'application/xml');
}

function getEdit(event: Event): EditV2 | undefined {
  if (!(event instanceof CustomEvent)) {
    return undefined;
  }

  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null || !('edit' in detail)) {
    return undefined;
  }

  return isEditV2(detail.edit) ? detail.edit : undefined;
}

async function enterText(
  field: HTMLElement,
  value: string
): Promise<void> {
  if (!Reflect.set(field, 'value', value)) {
    throw new Error('Could not set the text field value');
  }

  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

describe('virtual-template-ied menu plugin', () => {
  let doc: XMLDocument;
  let plugin: VirtualTemplateIed;

  beforeEach(async () => {
    doc = await loadDocument();
    plugin = await fixture(
      html`<virtual-template-ied .doc=${doc}></virtual-template-ied>`
    );
    await plugin.updateComplete;
    await plugin.run();
  });

  it('lists every unreferenced non-LLN0 node and requires all inputs', () => {
    const selectionList =
      plugin.shadowRoot?.querySelector<OscdSelectionList>(
        'oscd-selection-list'
      );
    const saveButton = plugin.shadowRoot?.querySelector('oscd-filled-button');

    expect(selectionList?.items).to.have.length(
      doc.querySelectorAll('LNode[iedName="None"]:not([lnClass="LLN0"])')
        .length
    );
    expect(saveButton).to.have.attribute('disabled');
  });

  it('emits an EditV2 insertion for selected nodes and closes the dialog', async () => {
    const manufacturer =
      plugin.shadowRoot?.querySelector<HTMLElement>(
        'oscd-outlined-text-field[label="Manufacturer"]'
      ) ?? null;
    const apName =
      plugin.shadowRoot?.querySelector<HTMLElement>(
        'oscd-outlined-text-field[label="AccessPoint name"]'
      ) ?? null;
    const selectionList =
      plugin.shadowRoot?.querySelector<OscdSelectionList>(
        'oscd-selection-list'
      );
    const saveButton = plugin.shadowRoot?.querySelector('oscd-filled-button');
    const dialog = plugin.shadowRoot?.querySelector('oscd-dialog');

    if (!manufacturer || !apName || !selectionList || !saveButton || !dialog) {
      throw new Error('Virtual Template IED controls were not rendered');
    }

    const selectedElement = selectionList.items[0]?.attachedElement;
    if (!selectedElement) {
      throw new Error('Virtual Template IED has no selectable LNodes');
    }

    let edit: EditV2 | undefined;
    plugin.addEventListener('oscd-edit-v2', (event) => {
      edit = getEdit(event);
    });

    await enterText(manufacturer, 'Example Manufacturer');
    await enterText(apName, 'AP1');
    selectionList.dispatchEvent(
      new CustomEvent('selection-list-change', {
        detail: { selectedElements: [selectedElement] },
      })
    );
    await plugin.updateComplete;

    expect(saveButton).to.not.have.attribute('disabled');
    saveButton.click();

    expect(edit).to.satisfy(isInsert);
    if (!edit || !isInsert(edit)) {
      throw new Error('Expected the plugin to emit an Insert edit');
    }

    const inserted = edit.node;
    if (!(inserted instanceof Element)) {
      throw new Error('Expected the inserted node to be an Element');
    }

    expect(inserted.namespaceURI).to.equal(doc.documentElement.namespaceURI);
    expect(inserted.tagName).to.equal('IED');
    expect(inserted.getAttribute('name')).to.equal('SPECIFICATION');
    expect(inserted.getAttribute('manufacturer')).to.equal(
      'Example Manufacturer'
    );
    expect(inserted.querySelector('Authentication')).to.exist;
    expect(inserted.querySelectorAll('LN0')).to.have.length(1);
    expect(inserted.querySelectorAll('LN').length).to.equal(1);
    expect(edit.parent).to.equal(doc.documentElement);
    expect(dialog.open).to.equal(false);
  });
});
