'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'shared/address-autocomplete.js'), 'utf8');

class EventTargetMock {
  constructor() { this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) {
    event.target ||= this;
    for (const fn of this.listeners[event.type] || []) fn.call(this, event);
    return true;
  }
}

function makeEnv({ apiKey = '', google = null } = {}) {
  const form = new EventTargetMock();
  const hiddenNames = [
    'property_formatted_address','property_street','property_city','property_county',
    'property_state','property_zip','property_country','property_place_id','address_selection_method'
  ];
  const hidden = Object.fromEntries(hiddenNames.map(name => [name, { name, value: name === 'address_selection_method' ? 'manual' : '' }]));
  form.querySelector = selector => {
    const match = selector.match(/\[name="([^"]+)"\]/);
    return match ? hidden[match[1]] || null : null;
  };

  const label = { appendChild(node) { this.helper = node; } };
  const input = new EventTargetMock();
  Object.assign(input, {
    id: 'property-address', value: '', dataset: {}, attributes: {},
    closest(selector) { return selector === 'form' ? form : selector === 'label' ? label : null; },
    setAttribute(k,v) { this.attributes[k] = String(v); },
    blur() {}, focus() {},
  });

  const document = new EventTargetMock();
  document.documentElement = { dataset: {} };
  document.head = { appendChild(node) { document.script = node; } };
  document.querySelector = selector => {
    if (selector === '[data-address-autocomplete="property"]') return input;
    if (selector === 'script[data-google-places-loader]') return null;
    return null;
  };
  document.createElement = tag => {
    const node = new EventTargetMock();
    node.tagName = tag.toUpperCase();
    node.dataset = {};
    node.setAttribute = (k,v) => { node[k] = String(v); };
    return node;
  };

  const window = {
    LANDING_PAGE_CONFIG: { googlePlacesApiKey: apiKey },
    google,
    setTimeout(fn) { window.pendingTimeout = fn; return 1; },
    clearTimeout() {},
    CustomEvent: function(type, init = {}) { this.type = type; this.detail = init.detail; this.bubbles = init.bubbles; },
  };
  const context = vm.createContext({
    window, document, console,
    CustomEvent: window.CustomEvent,
    Event: function(type, init = {}) { this.type = type; this.bubbles = init.bubbles; },
    Object, Array, String
  });
  vm.runInContext(code, context);
  return { window, document, form, input, hidden, label };
}

const tests = [];
const test = (name, fn) => tests.push({name, fn});

test('blank API key preserves manual entry and helper guidance', () => {
  const env = makeEnv();
  assert.equal(env.input.dataset.addressAutocompleteState, 'manual');
  assert.equal(env.document.documentElement.dataset.addressAutocompleteState, 'manual');
  assert.ok(env.label.helper.textContent.includes('manually'));
});

test('typed manual address synchronizes canonical fields on submit', () => {
  const env = makeEnv();
  env.input.value = '833 Corporate Way, Fremont, CA 94539';
  env.form.dispatchEvent({ type: 'submit' });
  assert.equal(env.hidden.property_formatted_address.value, env.input.value);
  assert.equal(env.hidden.address_selection_method.value, 'manual');
});

test('address ready event exposes stable handoff detail', () => {
  const env = makeEnv();
  let detail;
  env.form.addEventListener('address:ready', event => { detail = event.detail; });
  env.input.value = '123 Main St, Fremont, CA';
  env.form.dispatchEvent({ type: 'submit' });
  assert.deepEqual(detail, { method: 'manual', formattedAddress: '123 Main St, Fremont, CA' });
});

test('API key loads Places once and falls back after timeout', () => {
  const env = makeEnv({ apiKey: 'test-key' });
  assert.ok(env.document.script);
  assert.ok(env.document.script.src.includes('libraries=places'));
  assert.ok(env.document.script.src.includes('key=test-key'));
  env.window.pendingTimeout();
  assert.equal(env.input.dataset.addressAutocompleteState, 'unavailable');
});

test('Google selection stores formatted and structured address', () => {
  let placeChanged;
  const place = {
    formatted_address: '405 Mission Peak Dr, Fremont, CA 94539, USA',
    place_id: 'place-123',
    address_components: [
      { long_name:'405', short_name:'405', types:['street_number'] },
      { long_name:'Mission Peak Drive', short_name:'Mission Peak Dr', types:['route'] },
      { long_name:'Fremont', short_name:'Fremont', types:['locality'] },
      { long_name:'Alameda County', short_name:'Alameda County', types:['administrative_area_level_2'] },
      { long_name:'California', short_name:'CA', types:['administrative_area_level_1'] },
      { long_name:'94539', short_name:'94539', types:['postal_code'] },
      { long_name:'United States', short_name:'US', types:['country'] },
    ]
  };
  class Autocomplete {
    constructor() {}
    setBounds() {}
    addListener(name, fn) { if (name === 'place_changed') placeChanged = fn; }
    getPlace() { return place; }
  }
  class LatLngBounds { constructor() {} }
  const env = makeEnv({ google: { maps: { places: { Autocomplete }, LatLngBounds } } });
  placeChanged();
  assert.equal(env.hidden.property_formatted_address.value, place.formatted_address);
  assert.equal(env.hidden.property_street.value, '405 Mission Peak Drive');
  assert.equal(env.hidden.property_city.value, 'Fremont');
  assert.equal(env.hidden.property_state.value, 'CA');
  assert.equal(env.hidden.property_zip.value, '94539');
  assert.equal(env.hidden.property_place_id.value, 'place-123');
  assert.equal(env.hidden.address_selection_method.value, 'autocomplete');
});

test('editing selected address clears stale structured values', () => {
  let placeChanged;
  class Autocomplete {
    setBounds() {}
    addListener(name, fn) { if (name === 'place_changed') placeChanged = fn; }
    getPlace() { return { formatted_address:'100 First St, Fremont, CA', place_id:'x', address_components:[] }; }
  }
  class LatLngBounds {}
  const env = makeEnv({ google: { maps: { places: { Autocomplete }, LatLngBounds } } });
  placeChanged();
  env.input.value = '100 First Street Unit 2, Fremont, CA';
  env.input.dispatchEvent({ type:'input' });
  assert.equal(env.hidden.property_place_id.value, '');
  assert.equal(env.hidden.address_selection_method.value, 'manual');
});

let failures = 0;
for (const t of tests) {
  try { t.fn(); console.log('PASS', t.name); }
  catch (error) { failures += 1; console.error('FAIL', t.name, '\n ', error.stack); }
}
console.log(`\n${tests.length - failures}/${tests.length} address runtime tests passed`);
process.exitCode = failures ? 1 : 0;
