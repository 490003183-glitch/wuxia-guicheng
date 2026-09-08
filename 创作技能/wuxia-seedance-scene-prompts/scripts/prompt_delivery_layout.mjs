// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import {renderStyleReferences as renderUncheckedStyles} from './prompt_delivery_ui.mjs';
export * from './prompt_delivery_ui.mjs';

// Node-side file checks; browser rendering uses URLs served by the local reader.
export function renderStyleReferences(references = []) {
  for (const asset of references) {
    if (!asset.id || !path.isAbsolute(asset.path || '') || !/\.(avif|gif|jpe?g|png|webp)$/i.test(asset.path) || !fs.statSync(asset.path).isFile()) {
      throw new Error('Invalid local style reference: '+(asset.id || asset.path));
    }
  }
  return renderUncheckedStyles(references);
}
