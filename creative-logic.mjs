export function detectClaimWarnings(text, approvedProof = '') {
  const content = String(text || '');
  const proof = String(approvedProof || '').toLowerCase();
  const warnings = [];
  const rules = [
    ['Absolute claim', /\b(best|#\s*1|number one|world.?class|unmatched|fastest|only solution)\b/i],
    ['Guarantee / certainty', /\b(guaranteed|guarantee|always|never fails|100%\s*(?:guaranteed)?|risk-free)\b/i],
    ['Outcome claim', /\b(double|triple|increase\b.{0,30}\bby|reduce\b.{0,30}\bby|save\b.{0,30}\bhours|cut\b.{0,30}\bby)\b/i],
    ['Urgency / scarcity claim', /\b(only \d+ left|limited time|last chance|act now)\b/i],
  ];
  for (const [name, pattern] of rules) {
    const match = content.match(pattern);
    if (match) warnings.push({ name, detail: `Review “${match[0]}” against the approved brief and evidence.` });
  }
  const numericClaims = content.match(/\b\d+(?:\.\d+)?%|\$\s?\d[\d,.]*(?:\s?(?:k|m|million|billion))?\b/gi) || [];
  for (const claim of new Set(numericClaims)) {
    if (!proof.includes(claim.toLowerCase())) warnings.push({ name: 'Unverified numeric claim', detail: `Verify “${claim}” against approved evidence before use.` });
  }
  return warnings;
}

export function createLocalVariants(data) {
  const product = data.product.trim();
  const audience = data.audience.trim() || 'the intended audience';
  const message = data.keyMessage.trim() || data.brief.trim();
  const tone = data.tone.trim() || 'Clear and credible';
  const platform = data.platform.trim() || 'General social';
  const action = data.callToAction.trim() || 'Learn more';
  const evidence = data.proof.trim();
  const variants = [
    {
      angle: 'Problem framing',
      hook: `A question for ${audience}: what part of this process deserves a closer look?`,
      copy: `${product} is presented in this brief as ${message} Use this perspective to start a conversation about the current process.`,
      cta: action,
    },
    {
      angle: 'Practical next step',
      hook: `Start with one clear question about the workflow.`,
      copy: `For ${audience}, the brief describes ${message} Consider how that stated capability fits your team's needs before choosing a next step.`,
      cta: action,
    },
    {
      angle: 'Consideration checklist',
      hook: `Before evaluating ${product}, clarify the need.`,
      copy: `Identify the task, understand the constraints, and compare them with the information supplied about ${product}: ${message} Tone: ${tone}.`,
      cta: action,
    },
  ];
  return variants.map(variant => ({
    ...variant,
    proof: evidence || 'No approved proof points supplied; keep claims descriptive.',
    warnings: detectClaimWarnings(`${variant.hook}\n${variant.copy}\n${variant.cta}`, evidence),
    platform,
  }));
}

export function validateCreativeResult(result) {
  if (!result || !result.brief || !Array.isArray(result.variants) || result.variants.length !== 3) return false;
  const required = ['product', 'objective', 'audience', 'platform', 'coreMessage', 'offer', 'tone', 'callToAction', 'requiredProof'];
  if (required.some(key => typeof result.brief[key] !== 'string')) return false;
  const angles = new Set();
  for (const variant of result.variants) {
    if (!variant || ['angle', 'hook', 'copy', 'cta', 'proof'].some(key => typeof variant[key] !== 'string' || !variant[key].trim())) return false;
    angles.add(variant.angle.trim().toLowerCase());
  }
  return angles.size === result.variants.length
    && new Set(result.variants.map(variant => variant.copy.trim().toLowerCase())).size === result.variants.length;
}

export function createReviewState(result, data) {
  const approvedProof = data.proof || 'No approved proof points supplied; keep claims descriptive.';
  return {
    brief: { ...result.brief },
    proof: data.proof || '',
    briefRevision: 0,
    history: [],
    variants: result.variants.map((variant, index) => ({
      ...variant,
      proof: approvedProof,
      id: `variant-${index + 1}`,
      warnings: detectClaimWarnings(`${variant.hook}\n${variant.copy}\n${variant.cta}\n${variant.proof}`, data.proof || ''),
      sourceRevision: 0,
      approvedRevision: null,
      rejected: false,
    })),
  };
}

export function updateBrief(state, changes) {
  const brief = { ...state.brief, ...changes };
  const changed = Object.keys(changes).some(key => brief[key] !== state.brief[key]);
  if (!changed) return state;
  const revision = state.briefRevision + 1;
  const proof = brief.requiredProof !== state.brief.requiredProof
    ? brief.requiredProof
    : state.proof;
  return {
    ...state,
    brief,
    proof,
    briefRevision: revision,
    history: [...state.history, { action: 'Brief changed', revision }],
    variants: state.variants.map(variant => ({
      ...variant,
      warnings: detectClaimWarnings(
        `${variant.hook}\n${variant.copy}\n${variant.cta}\n${variant.proof}`,
        proof,
      ),
    })),
  };
}

export function editVariant(state, id, changes) {
  const target = state.variants.find(variant => variant.id === id);
  if (!target) return state;
  const changed = Object.keys(changes).some(key => target[key] !== changes[key]);
  if (!changed) return state;
  const variants = state.variants.map(variant => variant.id !== id ? variant : {
    ...variant,
    ...changes,
    warnings: detectClaimWarnings(
      `${changes.hook ?? variant.hook}\n${changes.copy ?? variant.copy}\n${changes.cta ?? variant.cta}\n${changes.proof ?? variant.proof}`,
      state.proof,
    ),
    sourceRevision: state.briefRevision,
    approvedRevision: null,
    rejected: false,
  });
  return {
    ...state,
    variants,
    history: [...state.history, { action: 'Variant edited', id, revision: state.briefRevision }],
  };
}

export function approveVariant(state, id) {
  const variants = state.variants.map(variant => variant.id !== id ? variant : {
    ...variant,
    approvedRevision: state.briefRevision,
    sourceRevision: state.briefRevision,
    rejected: false,
  });
  return {
    ...state,
    variants,
    history: [...state.history, { action: 'Variant approved', id, revision: state.briefRevision }],
  };
}

export function rejectVariant(state, id) {
  const variants = state.variants.map(variant => variant.id !== id ? variant : {
    ...variant,
    approvedRevision: null,
    rejected: true,
  });
  return {
    ...state,
    variants,
    history: [...state.history, { action: 'Variant rejected', id, revision: state.briefRevision }],
  };
}

export function isVariantApproved(state, variant) {
  return !variant.rejected
    && variant.sourceRevision === state.briefRevision
    && variant.approvedRevision === state.briefRevision;
}

export function exportApprovedVariants(state) {
  return state.variants.filter(variant => isVariantApproved(state, variant));
}

export function validateReviewState(state) {
  const briefFields = ['product', 'objective', 'audience', 'platform', 'coreMessage', 'offer', 'tone', 'callToAction', 'requiredProof'];
  if (!state || !state.brief || briefFields.some(key => typeof state.brief[key] !== 'string')
    || typeof state.proof !== 'string'
    || !Number.isInteger(state.briefRevision) || state.briefRevision < 0
    || !Array.isArray(state.history) || !Array.isArray(state.variants) || state.variants.length !== 3
    || !['LOCAL MODE — deterministic concepts', 'AI-ASSISTED — REVIEW CLAIMS'].includes(state.source)) return false;
  if (!state.history.every(event => event && typeof event.action === 'string'
    && Number.isInteger(event.revision) && event.revision >= 0)) return false;
  return state.variants.every(variant => variant
    && ['id', 'angle', 'hook', 'copy', 'cta', 'proof', 'platform'].every(key => typeof variant[key] === 'string')
    && Array.isArray(variant.warnings)
    && variant.warnings.every(warning => warning && typeof warning.name === 'string' && typeof warning.detail === 'string')
    && Number.isInteger(variant.sourceRevision) && variant.sourceRevision >= 0
    && (variant.approvedRevision === null || (Number.isInteger(variant.approvedRevision) && variant.approvedRevision >= 0))
    && typeof variant.rejected === 'boolean');
}

export function readCreativeStorage(storage, key = 'scalezix_creative_review_v1') {
  if (!storage) return { state: null, error: 'Browser storage is unavailable.' };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { state: null, error: null };
    const state = JSON.parse(raw);
    if (!validateReviewState(state)) throw new Error('Saved campaign review has an invalid shape.');
    return { state, error: null };
  } catch (error) {
    return { state: null, error: error.message || 'Browser storage is unavailable.' };
  }
}

export function persistCreativeStorage(storage, state, key = 'scalezix_creative_review_v1') {
  if (!storage) return { saved: false, error: 'Browser storage is unavailable.' };
  if (!validateReviewState(state)) return { saved: false, error: 'Campaign review failed storage validation.' };
  try {
    storage.setItem(key, JSON.stringify(state));
    return { saved: true, error: null };
  } catch (error) {
    return { saved: false, error: error.message || 'Browser storage is unavailable.' };
  }
}

export function clearCreativeStorage(storage, key = 'scalezix_creative_review_v1') {
  if (!storage) return { cleared: false, error: 'Browser storage is unavailable.' };
  try {
    storage.removeItem(key);
    return { cleared: true, error: null };
  } catch (error) {
    return { cleared: false, error: error.message || 'Browser storage is unavailable.' };
  }
}
