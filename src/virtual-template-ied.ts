import { css, html, LitElement } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import type { EditV2 } from '@openscd/oscd-api';
import { newEditEventV2 } from '@openscd/oscd-api/utils.js';
import { getReference } from '@openscd/scl-lib';
import { OscdFilledButton } from '@omicronenergy/oscd-ui/button/OscdFilledButton.js';
import { OscdDialog } from '@omicronenergy/oscd-ui/dialog/OscdDialog.js';
import { OscdOutlinedSelect } from '@omicronenergy/oscd-ui/select/OscdOutlinedSelect.js';
import { OscdSelectOption } from '@omicronenergy/oscd-ui/select/OscdSelectOption.js';
import {
  OscdSelectionList,
  type SelectItem,
  type SelectionListChangeEvent,
} from '@omicronenergy/oscd-ui/selection-list/OscdSelectionList.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { OscdOutlinedTextField } from '@omicronenergy/oscd-ui/textfield/OscdOutlinedTextField.js';

import {
  getLDeviceDescriptions,
  getSpecificationIED,
  groupLNodesToFunctions,
} from './foundation/virtual-template-ied.js';
import type { FunctionElementDescription } from './foundation/virtual-template-ied.js';

export default class VirtualTemplateIed extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'oscd-filled-button': OscdFilledButton,
    'oscd-dialog': OscdDialog,
    'oscd-outlined-select': OscdOutlinedSelect,
    'oscd-select-option': OscdSelectOption,
    'oscd-selection-list': OscdSelectionList,
    'oscd-text-button': OscdTextButton,
    'oscd-outlined-text-field': OscdOutlinedTextField,
  };

  @property({ attribute: false })
  doc?: XMLDocument;

  @property({ type: String })
  docName?: string;

  @property({ attribute: false })
  docVersion?: unknown;

  @property({ type: String })
  locale?: string;

  @state()
  private functionDescriptions: Record<string, FunctionElementDescription> =
    {};

  @state()
  private lLN0Types: Element[] = [];

  @state()
  private selectedLNodes: Element[] = [];

  @state()
  private manufacturer = '';

  @state()
  private description = '';

  @state()
  private apName = '';

  @query('oscd-dialog')
  private dialog?: OscdDialog;

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    if (!changedProperties.has('doc')) {
      return;
    }

    this.selectedLNodes = [];
    if (!this.doc) {
      this.functionDescriptions = {};
      this.lLN0Types = [];
      return;
    }

    const unreferencedLNodes = Array.from(
      this.doc.querySelectorAll('LNode[iedName="None"]')
    ).filter(lNode => lNode.getAttribute('lnClass') !== 'LLN0');

    this.functionDescriptions = groupLNodesToFunctions(unreferencedLNodes);
    this.lLN0Types = Array.from(
      this.doc.querySelectorAll('LNodeType[lnClass="LLN0"]')
    );
  }

  private get validPrimaryAction(): boolean {
    return (
      this.selectedLNodes.length > 0 &&
      this.manufacturer !== '' &&
      this.apName !== '' &&
      this.lLN0Types.length > 0
    );
  }

  async run(): Promise<void> {
    await this.updateComplete;
    if (!this.doc) {
      return;
    }

    if (!this.dialog) {
      throw new Error('Virtual Template IED dialog was not rendered');
    }

    this.dialog.open = true;
  }

  private handleManufacturerInput(event: Event): void {
    const value = this.textFieldValue(event);
    this.manufacturer = value;
  }

  private handleDescriptionInput(event: Event): void {
    const value = this.textFieldValue(event);
    this.description = value;
  }

  private handleApNameInput(event: Event): void {
    const value = this.textFieldValue(event);
    this.apName = value;
  }

  private textFieldValue(event: Event): string {
    const field = event.currentTarget;
    if (!(field instanceof HTMLElement) || !('value' in field)) {
      throw new TypeError('Text input event has an unexpected target');
    }

    const { value } = field;
    if (typeof value !== 'string') {
      throw new TypeError('Text field value must be a string');
    }

    return value;
  }

  private handleSelectionChange(event: SelectionListChangeEvent): void {
    this.selectedLNodes = event.detail.selectedElements;
  }

  private handleClose(): void {
    if (this.dialog) {
      this.dialog.open = false;
    }
  }

  private handlePrimaryAction(): void {
    if (!this.doc || !this.validPrimaryAction) {
      return;
    }

    const selectedLLN0s = Array.from(
      this.dialog?.querySelectorAll<OscdOutlinedSelect>('oscd-outlined-select') ??
        []
    ).map(select => select.value);

    const ied = getSpecificationIED(this.doc, {
      manufacturer: this.manufacturer,
      desc: this.description === '' ? null : this.description,
      apName: this.apName,
      lDevices: getLDeviceDescriptions(
        this.functionDescriptions,
        this.selectedLNodes,
        selectedLLN0s
      ),
    });

    const edit: EditV2 = {
      node: ied,
      parent: this.doc.documentElement,
      reference: getReference(this.doc.documentElement, 'IED'),
    };
    this.dispatchEvent(newEditEventV2(edit));
    this.handleClose();
  }

  private renderLLN0s(
    functionID: string,
    functionDescription: FunctionElementDescription
  ): TemplateResult {
    const existingLLN0 = functionDescription.lln0;
    const options = existingLLN0 ? [existingLLN0] : this.lLN0Types;
    const initialType = existingLLN0
      ? existingLLN0.getAttribute('lnType')
      : options[0]?.getAttribute('id');

    if (!initialType) {
      return html``;
    }

    const value = `${functionID}: ${initialType}`;
    return html`<oscd-outlined-select
      label="LLN0 for ${functionID}"
      .value=${value}
      ?disabled=${existingLLN0 !== undefined}
    >
      ${options.map((option) => {
        const lnType = existingLLN0
          ? option.getAttribute('lnType')
          : option.getAttribute('id');
        return html`<oscd-select-option
          value="${functionID}: ${lnType}"
          headline=${lnType ?? ''}
        ></oscd-select-option>`;
      })}
    </oscd-outlined-select>`;
  }

  private getSelectionItems(): SelectItem[] {
    return Object.values(this.functionDescriptions).flatMap(
      functionDescription =>
        functionDescription.lNodes.map(lNode => ({
          headline: `${lNode.getAttribute('lnClass') ?? ''} ${lNode.getAttribute(
            'lnInst'
          ) ?? ''}${
            lNode.getAttribute('prefix')
              ? ` (${lNode.getAttribute('prefix')})`
              : ''
          }`,
          supportingText: functionDescription.uniqueName,
          attachedElement: lNode,
          selected: this.selectedLNodes.includes(lNode),
          disabled: this.lLN0Types.length === 0,
        }))
    );
  }

  render(): TemplateResult {
    if (!this.doc) {
      return html``;
    }

    const hasAvailableLLN0 = this.lLN0Types.length > 0;
    return html`<oscd-dialog>
      <span slot="headline">Create SPECIFICATION type IED</span>
      <div slot="content" class="dialog-content">
        <div class="metadata-fields">
          <oscd-outlined-text-field
            label="Manufacturer"
            .value=${this.manufacturer}
            required
            @input=${this.handleManufacturerInput}
          ></oscd-outlined-text-field>
          <oscd-outlined-text-field
            label="Description"
            .value=${this.description}
            @input=${this.handleDescriptionInput}
          ></oscd-outlined-text-field>
          <oscd-outlined-text-field
            label="AccessPoint name"
            .value=${this.apName}
            required
            @input=${this.handleApNameInput}
          ></oscd-outlined-text-field>
        </div>
        <section class="selection-section">
          <h3 class="section-heading">LLN0 type by function</h3>
          <div class="lln0-fields">
            ${Object.values(this.functionDescriptions).map(description =>
              this.renderLLN0s(description.uniqueName, description)
            )}
          </div>
        </section>
        ${hasAvailableLLN0
          ? html``
          : html`<p role="status">
              No LLN0 logical-node types are available. Add an LLN0 type before
              creating this IED.
            </p>`}
        <section class="selection-section">
          <h3 class="section-heading">Logical nodes</h3>
          <oscd-selection-list
            multiselect
            filterable
            searchhelper="Filter logical nodes"
            .items=${this.getSelectionItems()}
            ?inert=${!hasAvailableLLN0}
            @selection-list-change=${this.handleSelectionChange}
          ></oscd-selection-list>
        </section>
      </div>
      <div slot="actions" class="dialog-actions">
        <oscd-text-button @click=${this.handleClose}>Close</oscd-text-button>
        <oscd-filled-button
          ?disabled=${!this.validPrimaryAction}
          @click=${this.handlePrimaryAction}
          >Save</oscd-filled-button
        >
      </div>
    </oscd-dialog>`;
  }

  static styles = css`
    oscd-dialog {
      max-height: calc(100vh - 48px);
      max-width: min(64rem, calc(100vw - 48px));
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(92vw, 64rem);
      box-sizing: border-box;
    }

    .metadata-fields,
    .lln0-fields {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .selection-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }

    .section-heading {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0;
    }

    oscd-selection-list {
      height: min(32vh, 24rem);
      overflow: auto;
    }

    @media (min-width: 60rem) {
      .metadata-fields {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 40rem) {
      .metadata-fields,
      .lln0-fields {
        grid-template-columns: minmax(0, 1fr);
      }

      oscd-selection-list {
        height: min(30vh, 20rem);
      }
    }
  `;
}
