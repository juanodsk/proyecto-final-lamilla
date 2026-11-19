import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const skill = process.env.PRESENTATION_SKILL_DIR;
const python = process.env.RUNTIME_PYTHON;
if (!skill || !python) throw Error('Configura PRESENTATION_SKILL_DIR y RUNTIME_PYTHON.');
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
const finalPath = path.resolve('tmp/validada/defensa.pptx');
await fs.mkdir(path.dirname(finalPath), { recursive: true });
await finalizePresentation({
  workspaceDir: process.cwd(),
  candidatePath: path.resolve('tmp/pdfs/defensa-borrador.pptx'),
  finalPath,
  pythonExecutable: python,
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
  fontPolicy: { basis: 'design', families: ['Arial'] },
  verifyArtifactToolImport: true,
  receiptPath: path.resolve('tmp/pdfs/defensa-validacion.json'),
});
await fs.copyFile(finalPath, path.resolve('output/07-defensa.pptx'));
