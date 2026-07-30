# Address Autocomplete Deployment Checklist

## Google Cloud setup
- Enable Maps JavaScript API and Places API.
- Restrict the browser key to `https://408farmers.com/*` and `https://www.408farmers.com/*`.
- Do not commit an unrestricted server key.
- Confirm billing and API quota alerts are configured.

## Live smoke test
1. Open `/home` in a private browser window.
2. Type at least three characters in Property Address.
3. Select a California address and submit a test lead.
4. Confirm Formspree receives formatted address, street, city, county, state, ZIP, country, Place ID, and `autocomplete` method.
5. Edit a selected address and submit again. Confirm stale Place ID/components are cleared and method becomes `manual`.
6. Disable the API key or block Google Maps and confirm manual submission still works.
7. Verify keyboard selection, Escape dismissal, iPhone Safari, and Android Chrome.

## Expected hidden fields
`property_formatted_address`, `property_street`, `property_city`, `property_county`, `property_state`, `property_zip`, `property_country`, `property_place_id`, `address_selection_method`.
