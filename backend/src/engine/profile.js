// Cleans and validates the profile form before it is saved.
import { FIELDS } from './fields.js';

export function validateProfile(input) {
  const values = {};
  const errors = {};

  for (const [key, def] of Object.entries(FIELDS)) {
    const raw = input?.[key];
    if (raw === undefined) continue; // not sent: leave as it is
    if (raw === null || raw === '') {
      values[key] = null;
      continue;
    }
    if (def.type === 'number' || def.type === 'currency') {
      const n = Number(raw);
      if (Number.isNaN(n)) errors[key] = `${def.label} must be a number.`;
      else if (def.min !== undefined && n < def.min) errors[key] = `${def.label} cannot be below ${def.min}.`;
      else if (def.max !== undefined && n > def.max) errors[key] = `${def.label} cannot be above ${def.max}.`;
      else if (def.type === 'currency' && n > 2_000_000_000) errors[key] = `${def.label} is too large.`;
      else if ((def.step === 1 || def.type === 'currency') && !Number.isInteger(n)) {
        errors[key] = `${def.label} must be a whole number.`;
      } else values[key] = n;
    } else if (def.type === 'boolean') {
      if (raw === true || raw === 'true') values[key] = true;
      else if (raw === false || raw === 'false') values[key] = false;
      else errors[key] = `Choose Yes or No for ${def.label}.`;
    } else if (!def.options.includes(raw)) {
      errors[key] = `Choose a value from the list for ${def.label}.`;
    } else {
      values[key] = raw;
    }
  }
  return { values, errors };
}
