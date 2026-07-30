from pathlib import Path
from urllib.parse import urlparse
import json, re, sys
root=Path(__file__).resolve().parents[1]
checks=[]
def check(name, cond, detail=''):
    checks.append({'name':name,'passed':bool(cond),'detail':detail})

# Required assets and docs
for rel in ['shared/config.js','shared/coveragefit-launch.js','shared/score.js','shared/script.js','score/index.html','home/index.html','index.html','_redirects']:
    check(f'exists:{rel}', (root/rel).is_file())

score=(root/'score/index.html').read_text(encoding='utf-8')
check('score loads config before launcher', score.find('../shared/config.js') < score.find('../shared/coveragefit-launch.js'))
check('score loads launcher before score behavior', score.find('../shared/coveragefit-launch.js') < score.find('../shared/score.js'))
check('score has three CTA hooks', score.count('js-start-review') >= 3, str(score.count('js-start-review')))

home_pages={
 'home/index.html':'home_lander_form',
 'tech/index.html':'tech_eligibility_form',
 'engineers/index.html':'engineers_eligibility_form',
 'healthcare/index.html':'healthcare_eligibility_form',
}
for rel, entry in home_pages.items():
    text=(root/rel).read_text(encoding='utf-8')
    check(f'{rel}:form launch enabled', 'data-coveragefit-after-submit="true"' in text)
    check(f'{rel}:entry distinct', f'data-cf-entry="{entry}"' in text)
    check(f'{rel}:config before launcher', text.find('../shared/config.js') < text.find('../shared/coveragefit-launch.js'))
    check(f'{rel}:launcher before script', text.find('../shared/coveragefit-launch.js') < text.find('../shared/script.js'))

index=(root/'index.html').read_text(encoding='utf-8')
check('homepage has two CoverageFit launch elements', index.count('data-coveragefit-launch="home"') == 2, str(index.count('data-coveragefit-launch="home"')))
check('homepage keeps auto bundle local', 'href="auto-bundle/"' in index)

config=(root/'shared/config.js').read_text(encoding='utf-8')
check('canonical CoverageFit URL configured', 'https://coveragefit.com/home/' in config)
check('local fallback configured', '/home#form' in config)


address_js=(root/'shared/address-autocomplete.js').read_text(encoding='utf-8')
home=(root/'home/index.html').read_text(encoding='utf-8')
check('address autocomplete module exists', (root/'shared/address-autocomplete.js').is_file())
check('home address field is eligible', 'data-address-autocomplete="property"' in home)
check('home loads address module before form script', home.find('../shared/address-autocomplete.js') < home.find('../shared/script.js'))
check('address module restricts to US', "componentRestrictions: { country: 'us' }" in address_js)
check('address module requests address predictions', "types: ['address']" in address_js)
check('address module has California bounds', 'californiaBounds' in address_js)
check('address module preserves blank-key manual fallback', "setState('manual')" in address_js)
check('Google Places key is configurable', 'googlePlacesApiKey' in config)
check('address module has three-character threshold', 'MIN_QUERY_LENGTH = 3' in address_js)
check('address module adds accessible helper', 'address-autocomplete-helper' in address_js and 'aria-live' in address_js)
check('address module tracks query readiness', 'addressQueryReady' in address_js)
check('address module handles selected address', "place_changed" in address_js)
styles=(root/'shared/styles.css').read_text(encoding='utf-8')
check('Places dropdown styled', '.pac-container' in styles and '.pac-item' in styles)
check('Places rows are touch friendly', 'min-height:58px' in styles)
check('short queries suppress predictions', 'data-address-query-ready="false"' in styles)
check('1B sprint documentation exists', (root/'SPRINT-408-ADDR-1B.md').is_file())
check('1C sprint documentation exists', (root/'SPRINT-408-ADDR-1C.md').is_file())
check('1D sprint documentation exists', (root/'SPRINT-408-ADDR-1D.md').is_file())
check('1E sprint documentation exists', (root/'SPRINT-408-ADDR-1E.md').is_file())
check('address deployment checklist exists', (root/'ADDRESS-AUTOCOMPLETE-QA.md').is_file())
check('address runtime QA exists', (root/'qa/test-address-autocomplete.js').is_file())
for field in ['property_formatted_address','property_street','property_city','property_county','property_state','property_zip','property_country','property_place_id','address_selection_method']:
    check(f'home has structured address field: {field}', f'name=\"{field}\"' in home)
check('address module parses address components', 'parsePlace' in address_js and 'address_components' in address_js)
check('address module stores structured address', 'storeStructuredAddress' in address_js)
check('address module tracks autocomplete method', "setHiddenValue('address_selection_method', 'autocomplete')" in address_js)
check('address module preserves manual method', "setHiddenValue('address_selection_method', 'manual')" in address_js)
check('address module clears stale components', 'clearStructuredAddress' in address_js and 'currentValue !== selectedFormattedAddress' in address_js)
check('manual address syncs before submit', 'syncManualAddressForSubmit' in address_js and "form?.addEventListener('submit'" in address_js)
check('manual address populates canonical formatted field', "setHiddenValue('property_formatted_address', typedAddress)" in address_js)
check('pasted addresses retain manual support', "addEventListener('paste'" in address_js)
check('Google loader has timeout fallback', 'SCRIPT_LOAD_TIMEOUT_MS' in address_js and 'loadTimeout' in address_js)
check('address ready integration event exists', "CustomEvent('address:ready'" in address_js)

launcher=(root/'shared/coveragefit-launch.js').read_text(encoding='utf-8')
for field in ['campaign','source','entry','assessment','session_id']:
    check(f'launcher sends {field}', f"searchParams.set('{field}'" in launcher)
for field in ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','creative','referral']:
    check(f'launcher supports {field}', f"'{field}'" in launcher)

failed=[c for c in checks if not c['passed']]
result={'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'checks':checks}
(root/'B1_2D_QA.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'total':result['total'],'passed':result['passed'],'failed':result['failed']},indent=2))
if failed:
    for c in failed: print('FAIL',c['name'],c['detail'])
    sys.exit(1)
