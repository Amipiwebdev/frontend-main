// src/fontawesome.js
import { library } from '@fortawesome/fontawesome-svg-core';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import * as regularIcons from '@fortawesome/free-regular-svg-icons';
import * as brandsIcons from '@fortawesome/free-brands-svg-icons';

// Helper: filter all icons only (skip metadata exports)
const extractIcons = (iconPack) =>
  Object.keys(iconPack)
    .filter((key) => key.startsWith('fa')) // only the actual icons
    .map((iconName) => iconPack[iconName]);

library.add(
  ...extractIcons(solidIcons),
  ...extractIcons(regularIcons),
  ...extractIcons(brandsIcons)
);