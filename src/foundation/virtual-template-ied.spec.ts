import { expect } from '@open-wc/testing';

import {
  getFunctionNamingPrefix,
  getLDeviceDescriptions,
  getSpecificationIED,
  groupLNodesToFunctions,
} from './virtual-template-ied.js';

function parseScl(): XMLDocument {
  return new DOMParser().parseFromString(
    `<SCL xmlns="http://www.iec.ch/61850/2003/SCL">
      <Substation name="S1">
        <Function name="Protection">
          <LNode iedName="None" lnClass="LLN0" lnInst="" lnType="LLN0Type" />
          <LNode iedName="None" lnClass="PTOC" lnInst="1" lnType="PTOCType" prefix="P" />
          <LNode iedName="None" lnClass="PDIS" lnInst="1" lnType="PDISType" />
        </Function>
        <Function name="Control">
          <SubFunction name="Breaker">
            <LNode iedName="None" lnClass="XCBR" lnInst="1" lnType="XCBRType" />
          </SubFunction>
        </Function>
      </Substation>
    </SCL>`,
    'application/xml'
  );
}

describe('virtual template IED foundation', () => {
  it('groups unreferenced logical nodes under non-leaf functions', () => {
    const doc = parseScl();
    const lNodes = Array.from(
      doc.querySelectorAll('LNode[iedName="None"]:not([lnClass="LLN0"])')
    );
    const groups = groupLNodesToFunctions(lNodes);

    expect(Object.values(groups)).to.have.length(2);
    expect(
      Object.values(groups).find(description =>
        description.uniqueName.includes('Protection')
      )?.lNodes
    ).to.have.length(2);
    expect(
      Object.values(groups).some(description => description.lNodes.length === 1)
    ).to.equal(true);
    expect(getFunctionNamingPrefix(lNodes[0])).to.equal('P');
  });

  it('maps selected logical nodes and LLN0 type into an IED tree', () => {
    const doc = parseScl();
    const lNodes = Array.from(
      doc.querySelectorAll('LNode[iedName="None"]:not([lnClass="LLN0"])')
    );
    const functions = groupLNodesToFunctions(lNodes);
    const [functionDescription] = Object.values(functions);
    const lDevices = getLDeviceDescriptions(
      functions,
      [lNodes[0]],
      [`${functionDescription.uniqueName}: LLN0Type`]
    );

    const ied = getSpecificationIED(doc, {
      manufacturer: 'Example',
      desc: null,
      apName: 'AP1',
      lDevices,
    });

    expect(ied.namespaceURI).to.equal(doc.documentElement.namespaceURI);
    expect(ied.getAttribute('name')).to.equal('SPECIFICATION');
    expect(ied.querySelector('Authentication')).to.exist;
    expect(ied.querySelectorAll('LN0')).to.have.length(1);
    expect(ied.querySelectorAll('LN')).to.have.length(1);
    expect(ied.querySelector('LN')?.getAttribute('prefix')).to.equal('P');
  });
});
