# Virtual Template IED

Standalone OpenSCD menu plugin that creates a `SPECIFICATION` IED from
unreferenced LNodes in the SCL document.

The plugin groups eligible LNodes by their non-leaf Function/SubFunction
parent, lets the user choose an LLN0 type for each group, and inserts an IED
containing the selected LNs.

## Transformation rules

- Each Function/SubFunction with more than one LNode becomes an LDevice.
- The Function/SubFunction name is used as `LDevice.inst`. Names are not
  normalized; they must meet the SCL `inst` restrictions.
- When Function names are repeated in different parts of the substation
  hierarchy, parent names are added to produce unique LDevice names.
- For an LNode in a leaf SubFunction, the SubFunction name is used as its LN
  prefix.

## Development

The package uses the shared `@omicronenergy/oscd-tooling` scripts:

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run build` | TypeScript modules and declarations |
| `npm run bundle` | Build the plugin and demo bundles |
| `npm test` | Run behavior tests in Chromium |
| `npm run lint` | Run shared lint checks |
| `npm start` | Start the development demo |

The demo includes Open/Save, this menu plugin, and the remote Source Editor.
Google Fonts and the remote Source Editor require network access.

Original plugin copyright © 2023 Alliander N.V.

## License

Apache-2.0. See [LICENSE](LICENSE).
