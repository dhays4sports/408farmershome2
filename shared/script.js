// Always open landing pages at the top instead of restoring a previous scroll position.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const resetLandingScroll = () => {
  if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
};
window.addEventListener('pageshow', () => {
  resetLandingScroll();
  setTimeout(resetLandingScroll, 50);
});

(() => {
  const form = document.getElementById('leadForm');
  const status = document.getElementById('formStatus');
  const config = window.LANDING_PAGE_CONFIG || {};
  if (!form) return;
  const params = new URLSearchParams(location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(k => {
    const input = form.querySelector(`[name="${k}"]`);
    if (input) input.value = params.get(k) || '';
  });
  const pageInput = form.querySelector('[name="landing_page"]');
  if (pageInput) pageInput.value = location.href;
  const timeInput = form.querySelector('[name="submitted_at"]');
  if (timeInput) timeInput.value = new Date().toISOString();
  const normalizePhone = value => value.replace(/\D/g,'');
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); status.textContent='';
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const phone = normalizePhone(form.elements.phone.value);
    if (phone.length < 10) { status.textContent='Please enter a valid phone number.'; form.elements.phone.focus(); return; }
    const button = form.querySelector('button[type="submit"]');
    const label = button.querySelector('span:first-child');
    const original = label.textContent;
    button.disabled=true; label.textContent='Submitting…';
    const endpoint=(config.formEndpoint||'').trim();
    const prospectProfile = window.ProspectProfileBuilder
      ? window.ProspectProfileBuilder.fromForm(form)
      : null;
    if (prospectProfile && window.ProspectProfileBuilder) {
      window.ProspectProfileBuilder.save(prospectProfile);
    }
    const continueToCoverageFit = () => {
      if (form.dataset.coveragefitAfterSubmit !== 'true') {
        location.href=form.dataset.success||'thank-you.html';
        return;
      }
      if (!window.CoverageFitLauncher) {
        location.href=form.dataset.success||'thank-you.html';
        return;
      }
      label.textContent='Opening CoverageFit…';
      window.CoverageFitLauncher.launch({
        profile: prospectProfile,
        entry: form.dataset.cfEntry || 'lead_form',
        assessment: form.dataset.cfAssessment || 'home',
        fallbackUrl: form.dataset.success || 'thank-you.html',
        extra: {
          launch_surface: form.dataset.cfExtraLaunchSurface || 'lead_form',
          lead_captured: 'true'
        }
      });
    };
    if(!endpoint){
      sessionStorage.setItem('408farmersLead',JSON.stringify(Object.fromEntries(new FormData(form).entries())));
      continueToCoverageFit(); return;
    }
    try{
      const response=await fetch(endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error('Submission failed');
      continueToCoverageFit();
    }catch(e){status.textContent='Something went wrong. Please call or text (408) 327-6377.';button.disabled=false;label.textContent=original;}
  });
})();
