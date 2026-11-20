import { identity } from '@openscd/scl-lib';
import { createElement } from '@openscd/scl-lib/dist/foundation/utils.js';

const functionTypeElementTags = [
  'Function',
  'SubFunction',
  'EqFunction',
  'EqSubFunction',
];

const functionTypeSelector = functionTypeElementTags.join(',');

export type FunctionElementDescription = {
  uniqueName: string;
  lNodes: Element[];
  lln0?: Element;
};

type AnyLNDescription = {
  lnClass: string;
  inst: string;
  prefix: string | null;
  lnType: string;
};

export type LDeviceDescription = {
  validLdInst: string;
  anyLNs: AnyLNDescription[];
};

export type VirtualIEDDescription = {
  manufacturer: string;
  desc: string | null;
  apName: string;
  lDevices: LDeviceDescription[];
};

function getChildElementsByTagName(
  element: Element | null | undefined,
  tag: string
): Element[] {
  if (!element) {
    return [];
  }

  return Array.from(element.children).filter(child => child.tagName === tag);
}

function isLeafFunction(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  if (
    element.tagName !== 'SubFunction' &&
    element.tagName !== 'EqSubFunction'
  ) {
    return false;
  }

  return (
    element.children.length === 1 && element.children[0].tagName === 'LNode'
  );
}

export function getNonLeafParent(element: Element | null): Element | null {
  if (!element) {
    return null;
  }

  const directParent = element.parentElement;
  if (
    !directParent ||
    !functionTypeElementTags.includes(directParent.tagName)
  ) {
    return null;
  }

  if (isLeafFunction(directParent)) {
    return getNonLeafParent(directParent);
  }

  return directParent;
}

export function getFunctionNamingPrefix(lNode: Element): string {
  const lNodesPrefix = lNode.getAttribute('prefix');
  if (lNodesPrefix) {
    return lNodesPrefix;
  }

  return isLeafFunction(lNode.parentElement)
    ? lNode.parentElement?.getAttribute('name') ?? ''
    : '';
}

function canFunctionBeConvertedToLDevice(element: Element): boolean {
  if (!functionTypeElementTags.includes(element.tagName)) {
    return true;
  }

  return (
    !isLeafFunction(element) &&
    getChildElementsByTagName(element, 'LNode').length > 1
  );
}

function shortestIdentities(identities: string[]): string[] {
  const lengths = identities.map(identity => identity.split('>').length);
  const maxLength = Math.max(...lengths);

  let depth = 1;
  while (depth <= maxLength) {
    const next = identities.map(identity =>
      identity.split('>').slice(-depth).join('_')
    );
    if (new Set(next).size === next.length) {
      return next;
    }

    depth += 1;
  }

  return identities.map(identity => identity.split('>').join('_'));
}

function identityString(element: Element): string {
  return String(identity(element));
}

function getUniqueFunctionName(element: Element): string {
  if (!functionTypeElementTags.includes(element.tagName)) {
    return identityString(element);
  }

  const name = element.getAttribute('name');
  if (!name) {
    return identityString(element);
  }

  const sameNamed = Array.from(
    element.ownerDocument.querySelectorAll(functionTypeSelector)
  )
    .filter(functionElement => canFunctionBeConvertedToLDevice(functionElement))
    .filter(
      functionElement =>
        functionElement !== element &&
        functionElement.getAttribute('name') === name
    )
    .map(identityString);

  return shortestIdentities([identityString(element), ...sameNamed])[0];
}

export function groupLNodesToFunctions(
  lNodes: Element[]
): Record<string, FunctionElementDescription> {
  const functionElements: Record<string, FunctionElementDescription> = {};

  lNodes.forEach((lNode) => {
    const parentFunction = getNonLeafParent(lNode);
    if (!parentFunction) {
      return;
    }

    const key = identityString(parentFunction);
    if (functionElements[key]) {
      functionElements[key].lNodes.push(lNode);
      return;
    }

    functionElements[key] = {
      uniqueName: getUniqueFunctionName(parentFunction),
      lNodes: [lNode],
      lln0: getChildElementsByTagName(parentFunction, 'LNode').find(
        child => child.getAttribute('lnClass') === 'LLN0'
      ),
    };
  });

  return functionElements;
}

export function getLDeviceDescriptions(
  functions: Record<string, FunctionElementDescription>,
  selectedLNodes: Element[],
  selectedLLN0s: string[]
): LDeviceDescription[] {
  const lDeviceDescriptions: LDeviceDescription[] = [];

  Object.values(functions).forEach((functionDescription) => {
    const selectedFunctionLNodes = functionDescription.lNodes.filter(lNode =>
      selectedLNodes.includes(lNode)
    );
    if (selectedFunctionLNodes.length === 0) {
      return;
    }

    const selectedLLN0 = selectedLLN0s.find(selected =>
      selected.includes(functionDescription.uniqueName)
    );
    if (!selectedLLN0) {
      throw new Error(
        `No LLN0 type selected for ${functionDescription.uniqueName}`
      );
    }

    const lnType = selectedLLN0.split(': ')[1];
    if (!lnType) {
      throw new Error(
        `Invalid LLN0 selection for ${functionDescription.uniqueName}`
      );
    }

    lDeviceDescriptions.push({
      validLdInst: functionDescription.uniqueName,
      anyLNs: [
        { prefix: null, lnClass: 'LLN0', inst: '', lnType },
        ...selectedFunctionLNodes.map(lNode => ({
          prefix: getFunctionNamingPrefix(lNode),
          lnClass: lNode.getAttribute('lnClass') ?? '',
          inst: lNode.getAttribute('lnInst') ?? '',
          lnType: lNode.getAttribute('lnType') ?? '',
        })),
      ],
    });
  });

  return lDeviceDescriptions;
}

export function getSpecificationIED(
  ownerDocument: Document,
  virtualIED: VirtualIEDDescription
): Element {
  const ied = createElement(ownerDocument, 'IED', {
    name: 'SPECIFICATION',
    desc: virtualIED.desc,
    manufacturer: virtualIED.manufacturer,
  });

  const accessPoint = createElement(ownerDocument, 'AccessPoint', {
    name: virtualIED.apName,
  });
  const server = createElement(ownerDocument, 'Server', {});
  const authentication = createElement(ownerDocument, 'Authentication', {});
  server.appendChild(authentication);

  virtualIED.lDevices.forEach((lDeviceDescription) => {
    const lDevice = createElement(ownerDocument, 'LDevice', {
      inst: lDeviceDescription.validLdInst,
    });

    lDeviceDescription.anyLNs.forEach((anyLNDescription) => {
      const anyLN = createElement(
        ownerDocument,
        anyLNDescription.lnClass === 'LLN0' ? 'LN0' : 'LN',
        {
          prefix: anyLNDescription.prefix,
          lnClass: anyLNDescription.lnClass,
          inst: anyLNDescription.inst,
          lnType: anyLNDescription.lnType,
        }
      );

      lDevice.appendChild(anyLN);
    });

    server.appendChild(lDevice);
  });

  accessPoint.appendChild(server);
  ied.appendChild(accessPoint);
  return ied;
}
