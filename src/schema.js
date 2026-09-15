// schema.js — a minimal, honest JSON Schema *subset* validator.
//
// This is NOT a full JSON Schema implementation. It supports exactly what
// a Coupling needs to describe shape: `type`, `required`, `properties`,
// `additionalProperties`, `enum`, `minLength`/`maxLength` (strings),
// `minimum`/`maximum` (numbers), `items`/`minItems` (arrays). Anything
// beyond that (allOf/oneOf, $ref, regex patterns, conditionals) is out of
// scope for v1 and simply ignored rather than silently mis-validated —
// keep contracts to the supported subset.
//
// Every failure is collected with a JSON-pointer-ish path, so a Coupling
// rejection can say exactly which field, in which Station's contract,
// didn't match — never a bare "invalid".

/**
 * @param {object} schema
 * @param {*} data
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validate(schema, data) {
  const errors = [];
  validateNode(schema ?? {}, data, '$', errors);
  return { valid: errors.length === 0, errors };
}

function validateNode(schema, data, at, errors) {
  if (schema.type && !matchesType(data, schema.type)) {
    errors.push(`${at}: expected type "${schema.type}", got "${actualType(data)}"`);
    return; // type mismatch makes deeper checks meaningless
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${at}: value ${JSON.stringify(data)} is not one of [${schema.enum.map((v) => JSON.stringify(v)).join(', ')}]`);
  }

  if (schema.type === 'string') {
    if (typeof schema.minLength === 'number' && data.length < schema.minLength) {
      errors.push(`${at}: string length ${data.length} is below minLength ${schema.minLength}`);
    }
    if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) {
      errors.push(`${at}: string length ${data.length} exceeds maxLength ${schema.maxLength}`);
    }
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    if (typeof schema.minimum === 'number' && data < schema.minimum) {
      errors.push(`${at}: value ${data} is below minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && data > schema.maximum) {
      errors.push(`${at}: value ${data} exceeds maximum ${schema.maximum}`);
    }
  }

  if (schema.type === 'object') {
    const required = schema.required || [];
    for (const key of required) {
      if (data[key] === undefined || data[key] === null) {
        errors.push(`${at}.${key}: required field missing`);
      }
    }
    const props = schema.properties || {};
    for (const [key, subschema] of Object.entries(props)) {
      if (data[key] !== undefined) {
        validateNode(subschema, data[key], `${at}.${key}`, errors);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(props));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          errors.push(`${at}.${key}: additional property not allowed by this contract`);
        }
      }
    }
  }

  if (schema.type === 'array') {
    if (typeof schema.minItems === 'number' && data.length < schema.minItems) {
      errors.push(`${at}: array has ${data.length} item(s), below minItems ${schema.minItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => validateNode(schema.items, item, `${at}[${i}]`, errors));
    }
  }
}

function matchesType(data, type) {
  switch (type) {
    case 'string':
      return typeof data === 'string';
    case 'number':
      return typeof data === 'number' && !Number.isNaN(data);
    case 'integer':
      return typeof data === 'number' && Number.isInteger(data);
    case 'boolean':
      return typeof data === 'boolean';
    case 'object':
      return data !== null && typeof data === 'object' && !Array.isArray(data);
    case 'array':
      return Array.isArray(data);
    case 'null':
      return data === null;
    default:
      return true; // unknown declared type: not this validator's job to police
  }
}

function actualType(data) {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  return typeof data;
}
