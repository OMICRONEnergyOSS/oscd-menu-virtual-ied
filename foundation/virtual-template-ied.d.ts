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
export declare function getNonLeafParent(element: Element | null): Element | null;
export declare function getFunctionNamingPrefix(lNode: Element): string;
export declare function groupLNodesToFunctions(lNodes: Element[]): Record<string, FunctionElementDescription>;
export declare function getLDeviceDescriptions(functions: Record<string, FunctionElementDescription>, selectedLNodes: Element[], selectedLLN0s: string[]): LDeviceDescription[];
export declare function getSpecificationIED(ownerDocument: Document, virtualIED: VirtualIEDDescription): Element;
export {};
