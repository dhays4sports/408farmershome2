/**
 * 408-ADDR-1D — resilient manual-address fallback.
 *
 * Preserves the 1C structured capture while guaranteeing that typed, pasted,
 * unusual and newly assigned addresses can still be submitted. Manual values
 * are synchronized into the canonical formatted-address field at submit time.
 */
(() => {
  'use strict';

  const config = window.LANDING_PAGE_CONFIG || {};
  const apiKey = String(config.googlePlacesApiKey || '').trim();
  const input = document.querySelector('[data-address-autocomplete="property"]');

  if (!input) return;

  const form = input.closest('form');
  const MIN_QUERY_LENGTH = 3;
  const SCRIPT_LOAD_TIMEOUT_MS = 8000;
  const root = document.documentElement;
  const fieldLabel = input.closest('label');
  let selectedFormattedAddress = '';

  const hiddenFieldNames = [
    'property_formatted_address',
    'property_street',
    'property_city',
    'property_county',
    'property_state',
    'property_zip',
    'property_country',
    'property_place_id',
    'address_selection_method'
  ];

  const hiddenFields = Object.fromEntries(hiddenFieldNames.map((name) => [
    name,
    form?.querySelector(`[name="${name}"]`) || null
  ]));

  const setHiddenValue = (name, value) => {
    if (hiddenFields[name]) hiddenFields[name].value = String(value || '').trim();
  };

  const clearStructuredAddress = () => {
    [
      'property_formatted_address',
      'property_street',
      'property_city',
      'property_county',
      'property_state',
      'property_zip',
      'property_country',
      'property_place_id'
    ].forEach((name) => setHiddenValue(name, ''));
    setHiddenValue('address_selection_method', 'manual');
    selectedFormattedAddress = '';
    input.dataset.addressSelectionMethod = 'manual';
  };

  const componentValue = (components, type, format = 'long_name') => {
    const component = components.find((item) => item.types?.includes(type));
    return component?.[format] || '';
  };

  const parsePlace = (place) => {
    const components = Array.isArray(place?.address_components)
      ? place.address_components
      : [];
    const streetNumber = componentValue(components, 'street_number');
    const route = componentValue(components, 'route');
    const city = componentValue(components, 'locality')
      || componentValue(components, 'postal_town')
      || componentValue(components, 'sublocality_level_1')
      || componentValue(components, 'administrative_area_level_3');

    return {
      formattedAddress: place?.formatted_address || input.value.trim(),
      street: [streetNumber, route].filter(Boolean).join(' '),
      city,
      county: componentValue(components, 'administrative_area_level_2'),
      state: componentValue(components, 'administrative_area_level_1', 'short_name'),
      postalCode: componentValue(components, 'postal_code'),
      country: componentValue(components, 'country', 'short_name'),
      placeId: place?.place_id || ''
    };
  };

  const storeStructuredAddress = (address) => {
    setHiddenValue('property_formatted_address', address.formattedAddress);
    setHiddenValue('property_street', address.street);
    setHiddenValue('property_city', address.city);
    setHiddenValue('property_county', address.county);
    setHiddenValue('property_state', address.state);
    setHiddenValue('property_zip', address.postalCode);
    setHiddenValue('property_country', address.country);
    setHiddenValue('property_place_id', address.placeId);
    setHiddenValue('address_selection_method', 'autocomplete');
    selectedFormattedAddress = address.formattedAddress;
    input.dataset.addressSelectionMethod = 'autocomplete';
  };


  const syncManualAddressForSubmit = () => {
    const typedAddress = input.value.trim();

    if (!selectedFormattedAddress || typedAddress !== selectedFormattedAddress) {
      clearStructuredAddress();
      setHiddenValue('property_formatted_address', typedAddress);
      setHiddenValue('address_selection_method', 'manual');
    }

    // Exposes a stable integration hook for Formspree and future CoverageFit
    // handoff code without changing the existing submission pipeline.
    form?.dispatchEvent(new CustomEvent('address:ready', {
      bubbles: true,
      detail: {
        method: hiddenFields.address_selection_method?.value || 'manual',
        formattedAddress: hiddenFields.property_formatted_address?.value || typedAddress
      }
    }));
  };

  const helper = document.createElement('span');
  helper.className = 'address-autocomplete-helper';
  helper.id = `${input.id || 'property-address'}-autocomplete-help`;
  helper.setAttribute('aria-live', 'polite');
  helper.textContent = 'Start typing your property address. You can also enter it manually.';

  if (fieldLabel) fieldLabel.appendChild(helper);
  input.setAttribute('aria-describedby', helper.id);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('spellcheck', 'false');
  clearStructuredAddress();

  const setState = (state) => {
    input.dataset.addressAutocompleteState = state;
    root.dataset.addressAutocompleteState = state;

    if (state === 'ready') {
      helper.textContent = input.value.trim().length >= MIN_QUERY_LENGTH
        ? 'Choose the best matching address, or keep typing to enter it manually.'
        : 'Type at least 3 characters to see likely addresses.';
    } else if (state === 'loading') {
      helper.textContent = 'Loading smart address suggestions. Manual entry is still available.';
    } else {
      helper.textContent = 'Enter the property address manually.';
    }
  };

  const updateQueryState = () => {
    const currentValue = input.value.trim();
    const queryReady = currentValue.length >= MIN_QUERY_LENGTH;
    root.dataset.addressQueryReady = String(queryReady);
    input.dataset.addressQueryReady = String(queryReady);

    // Any edit after a Google selection changes the record back to manual and
    // clears stale structured components before the form can be submitted.
    if (selectedFormattedAddress && currentValue !== selectedFormattedAddress) {
      clearStructuredAddress();
    } else if (!selectedFormattedAddress) {
      setHiddenValue('address_selection_method', 'manual');
    }

    if (input.dataset.addressAutocompleteState === 'ready') {
      helper.textContent = queryReady
        ? 'Choose the best matching address, or keep typing to enter it manually.'
        : 'Type at least 3 characters to see likely addresses.';
    }
  };

  input.addEventListener('input', updateQueryState);
  input.addEventListener('paste', () => window.setTimeout(updateQueryState, 0));
  input.addEventListener('focus', updateQueryState);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.blur();
      input.focus({ preventScroll: true });
    }
  });
  form?.addEventListener('submit', syncManualAddressForSubmit, { capture: true });

  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.pac-container') && event.target !== input) {
      root.dataset.addressQueryReady = 'false';
    }
  });

  const initializeAutocomplete = () => {
    try {
      if (!window.google?.maps?.places?.Autocomplete) {
        setState('unavailable');
        return;
      }

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
        types: ['address'],
        strictBounds: false
      });

      const californiaBounds = new window.google.maps.LatLngBounds(
        { lat: 32.5121, lng: -124.6509 },
        { lat: 42.0126, lng: -114.1312 }
      );
      autocomplete.setBounds(californiaBounds);

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        const address = parsePlace(place);
        if (address.formattedAddress) input.value = address.formattedAddress;
        storeStructuredAddress(address);
        root.dataset.addressQueryReady = 'false';
        input.dataset.addressQueryReady = 'false';
        helper.textContent = 'Address selected. You can edit it before submitting.';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      input._coverageFitAddressAutocomplete = autocomplete;
      setState('ready');
      updateQueryState();
    } catch (error) {
      console.warn('Address autocomplete could not be initialized.', error);
      setState('unavailable');
    }
  };

  if (window.google?.maps?.places?.Autocomplete) {
    initializeAutocomplete();
    return;
  }

  if (!apiKey) {
    setState('manual');
    return;
  }

  const existingScript = document.querySelector('script[data-google-places-loader]');
  if (existingScript) {
    existingScript.addEventListener('load', initializeAutocomplete, { once: true });
    existingScript.addEventListener('error', () => setState('unavailable'), { once: true });
    return;
  }

  setState('loading');
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
  script.async = true;
  script.defer = true;
  script.dataset.googlePlacesLoader = 'true';
  let loadSettled = false;
  const loadTimeout = window.setTimeout(() => {
    if (loadSettled) return;
    loadSettled = true;
    setState('unavailable');
  }, SCRIPT_LOAD_TIMEOUT_MS);

  script.addEventListener('load', () => {
    if (loadSettled) return;
    loadSettled = true;
    window.clearTimeout(loadTimeout);
    initializeAutocomplete();
  }, { once: true });
  script.addEventListener('error', () => {
    if (loadSettled) return;
    loadSettled = true;
    window.clearTimeout(loadTimeout);
    setState('unavailable');
  }, { once: true });
  document.head.appendChild(script);
})();
