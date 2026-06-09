'use client';

import React, { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type DonationMode = 'one-time' | 'monthly';
type DonorType = 'alumni' | 'parent' | 'student' | 'faculty' | 'other';

interface OneTimeTier {
  amount: number;
  label: string;
  club?: string;
  clubDesc?: string;
  featured?: boolean;
}

interface MonthlyTier {
  amount: number;
  label: string;
  club?: string;
  clubDesc?: string;
  featured?: boolean;
}

// ─── Tier Data ────────────────────────────────────────────────────────────────

const ONE_TIME_TIERS: OneTimeTier[] = [
  {
    amount: 250,
    label: 'Builder',
  },
  {
    amount: 500,
    label: 'Patron',
  },
  {
    amount: 1000,
    label: 'Legacy Donor',
  },
  {
    amount: 2500,
    label: 'Founders Circle',
  },
  {
    amount: 5000,
    label: 'Visionary Circle',
  },
];

const ONE_TIME_CLUB: OneTimeTier = {
  amount: 190.60,
  label: '1906 Club',
  club: '1906 Club',
  clubDesc: 'Annual legacy giving circle — $190.60/year',
  featured: true,
};

const MONTHLY_TIERS: MonthlyTier[] = [
  {
    amount: 10,
    label: 'Supporter',
  },
  {
    amount: 25,
    label: 'Builder',
  },
  {
    amount: 50,
    label: 'Patron',
  },
  {
    amount: 100,
    label: 'Leadership Circle',
  },
  {
    amount: 222,
    label: 'Premier Alumni Circle',
    club: '222 Club',
    clubDesc: 'Premier sustaining alumni membership',
    featured: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number, mode: DonationMode): string {
  if (mode === 'monthly') return `$${amount}/mo`;
  if (amount === 190.60) return '$190.60/yr';
  return `$${amount.toLocaleString()}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DonatePage() {
  const [mode, setMode] = useState<DonationMode>('one-time');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedClub, setSelectedClub] = useState<boolean>(false);

  // Donor info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [donorType, setDonorType] = useState<DonorType | ''>('');
  const [gradYear, setGradYear] = useState('');
  const [affiliation, setAffiliation] = useState('');

  // Optional fields
  const [coverFees, setCoverFees] = useState(false);
  const [showOnWall, setShowOnWall] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // When switching modes, clear selection
  function handleModeSwitch(newMode: DonationMode) {
    setMode(newMode);
    setSelectedTier(null);
    setSelectedClub(false);
  }

  // Selected amount for fee calc
  function getSelectedAmount(): number | null {
    if (selectedClub) {
      if (mode === 'one-time') return ONE_TIME_CLUB.amount;
      const clubTier = MONTHLY_TIERS.find(t => t.featured);
      return clubTier ? clubTier.amount : null;
    }
    return selectedTier;
  }

  function getFeeAmount(): number {
    const base = getSelectedAmount();
    if (!base || !coverFees) return 0;
    return parseFloat((base * 0.03).toFixed(2));
  }

  function getTotalAmount(): number | null {
    const base = getSelectedAmount();
    if (!base) return null;
    return coverFees ? parseFloat((base + getFeeAmount()).toFixed(2)) : base;
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'A valid email is required.';
    if (!donorType) newErrors.donorType = 'Please select a donor type.';
    if (donorType === 'alumni' && !gradYear.trim()) newErrors.gradYear = 'Graduation year is required for alumni.';
    if (!selectedTier && !selectedClub) newErrors.tier = 'Please select a giving level.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    const amount = getTotalAmount();
    const tierLabel = selectedClub
      ? (mode === 'one-time' ? '1906 Club' : '222 Club')
      : (mode === 'one-time'
          ? ONE_TIME_TIERS.find(t => t.amount === selectedTier)?.label
          : MONTHLY_TIERS.find(t => t.amount === selectedTier)?.label);

    // In a real implementation, call your backend to create a Stripe Checkout Session
    // and redirect to session.url. This stub logs the payload.
    const payload = {
      amount,
      mode,
      tier: tierLabel,
      coverFees,
      donor: {
        fullName,
        email,
        donorType,
        ...(donorType === 'alumni' ? { gradYear, affiliation } : {}),
      },
      recognition: {
        showOnWall: anonymous ? false : showOnWall,
        anonymous,
        message,
      },
    };

    console.log('[Stripe Checkout payload]', payload);

    // TODO: Replace with real API call:
    // const res = await fetch('/api/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // const { url } = await res.json();
    // window.location.href = url;

    alert(`Redirecting to Stripe Checkout for ${mode === 'monthly' ? 'recurring' : 'one-time'} gift of $${amount}…\n\n(Wire up /api/create-checkout-session to go live.)`);
    setIsSubmitting(false);
  }

  const currentTiers = mode === 'monthly' ? MONTHLY_TIERS : ONE_TIME_TIERS;
  const total = getTotalAmount();

  return (
    <div>
      {/* ── NAV (identical to main page) ──────────────────────────────────── */}
      <nav>
        <div
          className="nav-brand"
          style={{ cursor: 'pointer' }}
          onClick={() => { window.location.href = '/'; }}
        >
          <img className="nav-crest" src="/assets/crest.png" alt="Crest" />
          <div className="nav-txt">
            <div className="nav-name">Renew 222</div>
            <div className="nav-sub">Acacia Wisconsin</div>
          </div>
        </div>
        <ul className="nav-links">
          <li><a href="/#mission">Our Mission</a></li>
          <li><a href="/#history">Our History</a></li>
          <li><a href="/#impact">Impact</a></li>
          <li><a href="/#support">Support</a></li>
        </ul>
        <button className="nav-give" onClick={() => {}}>Give Now</button>
      </nav>

      <main>
        {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
        <section className="donate-hero">
          <div className="donate-hero-inner">
            <div className="section-eyebrow" style={{ marginBottom: '1.2rem' }}>
              <div className="eyebrow-rule" />
              <div className="eyebrow-txt">Alumni Giving Campaign</div>
            </div>
            <h1 className="donate-hero-title">
              Make Your Gift to <em>Renew 222</em>
            </h1>
            <p className="donate-hero-lead">
              Your support preserves 222 Langdon Street for the next century of brotherhood.
              Choose a giving level below — every gift is an investment in a chapter that has
              endured since 1906.
            </p>
          </div>
        </section>

        {/* ── GIVING FORM ───────────────────────────────────────────────── */}
        <section className="donate-section">
          <div className="donate-grid">

            {/* LEFT — Tier selection */}
            <div className="donate-left">

              {/* Mode toggle */}
              <div className="donate-block">
                <div className="donate-block-label">Giving Type</div>
                <div className="mode-toggle">
                  <button
                    className={`mode-btn${mode === 'one-time' ? ' mode-btn--active' : ''}`}
                    onClick={() => handleModeSwitch('one-time')}
                    type="button"
                  >
                    One-Time
                  </button>
                  <button
                    className={`mode-btn${mode === 'monthly' ? ' mode-btn--active' : ''}`}
                    onClick={() => handleModeSwitch('monthly')}
                    type="button"
                  >
                    Monthly Recurring
                  </button>
                </div>
                {mode === 'monthly' && (
                  <p className="mode-note">
                    Sustaining gifts renew automatically each month and can be cancelled at any time.
                  </p>
                )}
              </div>

              {/* Tier grid */}
              <div className="donate-block">
                <div className="donate-block-label">
                  {mode === 'one-time' ? 'Annual & Legacy Giving' : 'Monthly Sustaining Giving'}
                </div>
                {errors.tier && <div className="field-error">{errors.tier}</div>}

                <div className="tier-grid">
                  {currentTiers.map((tier) => {
                    const isSelected = selectedTier === tier.amount && !selectedClub;
                    const isFeaturedClub = (tier as MonthlyTier).featured && mode === 'monthly';
                    return (
                      <button
                        key={tier.amount}
                        type="button"
                        className={`tier-card${isSelected ? ' tier-card--selected' : ''}${isFeaturedClub ? ' tier-card--club' : ''}`}
                        onClick={() => { setSelectedTier(tier.amount); setSelectedClub(false); }}
                      >
                        {isFeaturedClub && (
                          <span className="tier-club-badge">222 Club</span>
                        )}
                        <span className="tier-amount">{formatAmount(tier.amount, mode)}</span>
                        <span className="tier-label">{tier.label}</span>
                        {isFeaturedClub && tier.clubDesc && (
                          <span className="tier-club-desc">{tier.clubDesc}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Featured club card */}
                {mode === 'one-time' && (
                  <button
                    type="button"
                    className={`club-card${selectedClub ? ' club-card--selected' : ''}`}
                    onClick={() => { setSelectedClub(!selectedClub); setSelectedTier(null); }}
                  >
                    <div className="club-card-header">
                      <span className="club-badge">1906 Club</span>
                      <span className="club-check">{selectedClub ? '✓' : ''}</span>
                    </div>
                    <div className="club-card-amount">$190.60 / year</div>
                    <div className="club-card-desc">
                      Legacy giving circle · Annual commitment honoring our founding year.
                      Your name joins a permanent record of 1906 Club members.
                    </div>
                  </button>
                )}
              </div>

              {/* Fee coverage */}
              {(selectedTier || selectedClub) && (
                <div className="donate-block">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={coverFees}
                      onChange={e => setCoverFees(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      Add 3% to cover processing fees so 100% of your gift supports the chapter
                      {coverFees && getSelectedAmount() && (
                        <span className="fee-note"> (+${getFeeAmount().toFixed(2)})</span>
                      )}
                    </span>
                  </label>
                </div>
              )}

              {/* Recognition */}
              <div className="donate-block">
                <div className="donate-block-label">Recognition</div>
                <div className="recognition-options">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={showOnWall && !anonymous}
                      disabled={anonymous}
                      onChange={e => setShowOnWall(e.target.checked)}
                    />
                    <span className="checkbox-label">Show my name on the donor wall</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={e => {
                        setAnonymous(e.target.checked);
                        if (e.target.checked) setShowOnWall(false);
                      }}
                    />
                    <span className="checkbox-label">Donate anonymously</span>
                  </label>
                </div>
              </div>

              {/* Message */}
              <div className="donate-block">
                <label className="field-label" htmlFor="message">
                  Leave a message for the chapter <span className="field-optional">(optional)</span>
                </label>
                <textarea
                  id="message"
                  className="field-textarea"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Share what Acacia means to you, or a message for the brothers…"
                  rows={3}
                />
              </div>
            </div>

            {/* RIGHT — Donor info + summary */}
            <div className="donate-right">

              {/* Donor information */}
              <div className="donate-block donate-info-card">
                <div className="donate-block-label">Your Information</div>

                <div className="field-group">
                  <label className="field-label" htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    className={`field-input${errors.fullName ? ' field-input--error' : ''}`}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. James R. Mitchell"
                    autoComplete="name"
                  />
                  {errors.fullName && <div className="field-error">{errors.fullName}</div>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className={`field-input${errors.email ? ' field-input--error' : ''}`}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {errors.email && <div className="field-error">{errors.email}</div>}
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="donorType">I am a…</label>
                  <select
                    id="donorType"
                    className={`field-select${errors.donorType ? ' field-input--error' : ''}`}
                    value={donorType}
                    onChange={e => setDonorType(e.target.value as DonorType)}
                  >
                    <option value="">Select donor type</option>
                    <option value="alumni">Alumni</option>
                    <option value="parent">Parent</option>
                    <option value="student">Current Student</option>
                    <option value="faculty">Faculty / Staff</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.donorType && <div className="field-error">{errors.donorType}</div>}
                </div>

                {/* Alumni conditional fields */}
                {donorType === 'alumni' && (
                  <div className="alumni-fields">
                    <div className="field-group">
                      <label className="field-label" htmlFor="gradYear">
                        Graduation Year <span className="field-required">*</span>
                      </label>
                      <input
                        id="gradYear"
                        type="text"
                        className={`field-input${errors.gradYear ? ' field-input--error' : ''}`}
                        value={gradYear}
                        onChange={e => setGradYear(e.target.value)}
                        placeholder="e.g. 2008"
                        maxLength={4}
                      />
                      {errors.gradYear && <div className="field-error">{errors.gradYear}</div>}
                    </div>

                    <div className="field-group">
                      <label className="field-label" htmlFor="affiliation">
                        Affiliation Notes <span className="field-optional">(optional)</span>
                      </label>
                      <input
                        id="affiliation"
                        type="text"
                        className="field-input"
                        value={affiliation}
                        onChange={e => setAffiliation(e.target.value)}
                        placeholder="Chapter role, pledge class, etc."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Gift summary */}
              <div className="gift-summary">
                <div className="gift-summary-title">Gift Summary</div>
                {total ? (
                  <>
                    <div className="gift-summary-row">
                      <span>Giving level</span>
                      <span>
                        {selectedClub
                          ? (mode === 'one-time' ? '1906 Club' : '222 Club')
                          : currentTiers.find(t => t.amount === selectedTier)?.label ?? '—'}
                      </span>
                    </div>
                    <div className="gift-summary-row">
                      <span>Base amount</span>
                      <span>{formatAmount(getSelectedAmount()!, mode)}</span>
                    </div>
                    {coverFees && (
                      <div className="gift-summary-row gift-summary-row--fee">
                        <span>Processing fee (3%)</span>
                        <span>+${getFeeAmount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="gift-summary-row gift-summary-total">
                      <span>Total {mode === 'monthly' ? 'per month' : ''}</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    {mode === 'monthly' && (
                      <div className="gift-summary-note">
                        Billed monthly · Cancel anytime
                      </div>
                    )}
                  </>
                ) : (
                  <div className="gift-summary-empty">
                    Select a giving level to see your summary
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="button"
                className="btn-gold donate-submit-btn"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? 'Redirecting…'
                  : total
                    ? `Give $${total.toFixed(2)}${mode === 'monthly' ? '/mo' : ''} →`
                    : 'Select a giving level'}
              </button>

              <p className="donate-secure-note">
                🔒 Payments processed securely by Stripe. Your information is never stored on our servers.
              </p>

              {/* Stripe badge callout */}
              <div className="donate-stripe-note">
                <span>Questions? Email </span>
                <a href="mailto:alumni@acaciawisconsin.org">alumni@acaciawisconsin.org</a>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* ── FOOTER (identical to main page) ───────────────────────────────── */}
      <footer>
        <img className="ft-crest" src="/assets/crest.png" alt="Crest" />
        <div className="ft-name">Renew 222</div>
        <div className="ft-tag">Acacia Wisconsin House Corporation · Est. 1906 · Madison, Wisconsin</div>
        <div className="ft-links">
          <a href="/#mission">Our Mission</a>
          <a href="/#history">History</a>
          <a href="/#support">Support</a>
        </div>
        <div className="ft-copy"></div>
      </footer>

      <style>{`
        /* ── Donate-page-specific styles ─────────────────────────────────── */

        .donate-hero {
          background: linear-gradient(180deg, var(--bg2) 0%, var(--bg3) 100%);
          border-bottom: 2px solid var(--green);
          padding: 5rem 0 4rem;
        }

        .donate-hero-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 3rem;
          text-align: center;
        }

        .donate-hero-title {
          font-family: 'Georgia', serif;
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          font-weight: 400;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0 0 1.4rem;
        }

        .donate-hero-title em {
          color: var(--gold2);
          font-style: italic;
          font-weight: 700;
        }

        .donate-hero-lead {
          font-size: 1.05rem;
          color: var(--text2);
          line-height: 1.85;
          font-weight: 300;
          max-width: 620px;
          margin: 0 auto;
        }

        /* ── Page shell ──────────────────────────────────────────────────── */

        .donate-section {
          padding: 4rem 0 6rem;
          background: linear-gradient(180deg, var(--bg3) 0%, var(--bg) 100%);
        }

        .donate-grid {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 3rem;
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 3rem;
          align-items: start;
        }

        /* ── Shared block ────────────────────────────────────────────────── */

        .donate-block {
          margin-bottom: 2.5rem;
        }

        .donate-block-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold2);
          font-weight: 700;
          margin-bottom: 1rem;
          font-family: 'Georgia', serif;
        }

        /* ── Mode toggle ─────────────────────────────────────────────────── */

        .mode-toggle {
          display: flex;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          width: fit-content;
        }

        .mode-btn {
          background: transparent;
          border: none;
          padding: 10px 28px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text3);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Georgia', serif;
        }

        .mode-btn:first-child {
          border-right: 1px solid var(--border);
        }

        .mode-btn--active {
          background: linear-gradient(135deg, var(--gold), var(--gold2));
          color: #0f0d0a;
        }

        .mode-note {
          margin-top: 0.75rem;
          font-size: 12px;
          color: var(--text3);
          line-height: 1.6;
          font-style: italic;
        }

        /* ── Tier grid ───────────────────────────────────────────────────── */

        .tier-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.2rem;
        }

        .tier-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 1.4rem 1rem 1.2rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          position: relative;
          appearance: none;
        }

        .tier-card:hover {
          border-color: var(--gold);
          background: rgba(182, 145, 74, 0.08);
          transform: translateY(-2px);
        }

        .tier-card--selected {
          border-color: var(--gold2);
          background: rgba(182, 145, 74, 0.12);
          box-shadow: 0 0 0 1px var(--gold), 0 6px 20px rgba(182, 145, 74, 0.2);
        }

        .tier-card--club {
          border-color: var(--gold);
          border-top: 3px solid var(--gold2);
        }

        .tier-club-badge {
          position: absolute;
          top: -1px;
          right: 12px;
          background: linear-gradient(135deg, var(--gold), var(--gold2));
          color: #0f0d0a;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 0 0 4px 4px;
        }

        .tier-amount {
          font-family: 'Georgia', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gold2);
          line-height: 1;
        }

        .tier-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 600;
        }

        .tier-club-desc {
          font-size: 11px;
          color: var(--text2);
          line-height: 1.4;
          margin-top: 0.2rem;
          font-style: italic;
        }

        /* ── 1906 Club card ──────────────────────────────────────────────── */

        .club-card {
          width: 100%;
          background: linear-gradient(135deg, rgba(182, 145, 74, 0.06) 0%, rgba(27, 77, 122, 0.06) 100%);
          border: 1px solid var(--gold);
          border-left: 4px solid var(--gold2);
          border-radius: 6px;
          padding: 1.5rem 1.8rem;
          cursor: pointer;
          transition: all 0.25s;
          text-align: left;
          appearance: none;
        }

        .club-card:hover {
          background: rgba(182, 145, 74, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(182, 145, 74, 0.15);
        }

        .club-card--selected {
          background: rgba(182, 145, 74, 0.14);
          box-shadow: 0 0 0 1px var(--gold2), 0 8px 24px rgba(182, 145, 74, 0.2);
        }

        .club-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.6rem;
        }

        .club-badge {
          background: linear-gradient(135deg, var(--gold), var(--gold2));
          color: #0f0d0a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 3px;
        }

        .club-check {
          font-size: 1.1rem;
          color: var(--gold2);
          font-weight: 700;
          min-width: 20px;
          text-align: right;
        }

        .club-card-amount {
          font-family: 'Georgia', serif;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--gold2);
          margin-bottom: 0.5rem;
          line-height: 1;
        }

        .club-card-desc {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.65;
          font-weight: 300;
        }

        /* ── Recognition / checkbox rows ─────────────────────────────────── */

        .recognition-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
        }

        .checkbox-row input[type="checkbox"] {
          margin-top: 2px;
          accent-color: var(--gold);
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .checkbox-label {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.5;
        }

        .fee-note {
          color: var(--gold2);
          font-weight: 600;
        }

        /* ── Textarea / inputs ───────────────────────────────────────────── */

        .field-group {
          margin-bottom: 1.4rem;
        }

        .field-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text3);
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .field-optional {
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--text3);
          opacity: 0.7;
          text-transform: none;
          font-weight: 400;
        }

        .field-required {
          color: #c87941;
        }

        .field-input,
        .field-select,
        .field-textarea {
          width: 100%;
          background: rgba(15, 13, 10, 0.7);
          border: 1px solid rgba(182, 145, 74, 0.25);
          border-radius: 4px;
          padding: 12px 14px;
          font-size: 14px;
          color: var(--text);
          font-family: 'Georgia', serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
          appearance: none;
        }

        .field-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23b6914a' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }

        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(182, 145, 74, 0.15);
        }

        .field-input--error {
          border-color: #c87941 !important;
        }

        .field-error {
          font-size: 12px;
          color: #c87941;
          margin-top: 0.4rem;
          font-style: italic;
        }

        .field-textarea {
          resize: vertical;
          min-height: 90px;
          line-height: 1.6;
        }

        .field-input::placeholder,
        .field-textarea::placeholder {
          color: var(--text3);
          opacity: 0.6;
        }

        /* ── Right column ────────────────────────────────────────────────── */

        .donate-right {
          position: sticky;
          top: 90px;
        }

        .donate-info-card {
          background: linear-gradient(180deg, rgba(20, 18, 15, 0.8) 0%, rgba(25, 23, 20, 0.75) 100%);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 2rem 2rem 0.5rem;
          margin-bottom: 1.8rem;
        }

        /* ── Alumni conditional fields ───────────────────────────────────── */

        .alumni-fields {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          animation: slideDown 0.25s ease;
        }

        /* ── Gift summary ────────────────────────────────────────────────── */

        .gift-summary {
          background: linear-gradient(135deg, rgba(182, 145, 74, 0.07) 0%, rgba(27, 77, 122, 0.07) 100%);
          border: 1px solid var(--border);
          border-top: 3px solid var(--gold);
          border-radius: 6px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .gift-summary-title {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold2);
          font-weight: 700;
          margin-bottom: 1.2rem;
        }

        .gift-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text2);
          padding: 0.4rem 0;
          border-bottom: 1px solid rgba(182, 145, 74, 0.1);
        }

        .gift-summary-row:last-child {
          border-bottom: none;
        }

        .gift-summary-row--fee {
          color: var(--text3);
          font-size: 12px;
        }

        .gift-summary-total {
          font-size: 15px !important;
          font-weight: 700;
          color: var(--gold2) !important;
          padding-top: 0.8rem !important;
          margin-top: 0.3rem;
          border-top: 1px solid var(--border) !important;
          border-bottom: none !important;
          font-family: 'Georgia', serif;
        }

        .gift-summary-note {
          font-size: 11px;
          color: var(--text3);
          margin-top: 0.6rem;
          text-align: center;
          font-style: italic;
        }

        .gift-summary-empty {
          font-size: 13px;
          color: var(--text3);
          text-align: center;
          padding: 1rem 0;
          font-style: italic;
        }

        /* ── Submit button ───────────────────────────────────────────────── */

        .donate-submit-btn {
          width: 100%;
          padding: 16px;
          font-size: 13px;
          border-radius: 4px;
          margin-bottom: 1rem;
          cursor: pointer;
        }

        .donate-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .donate-secure-note {
          font-size: 11px;
          color: var(--text3);
          text-align: center;
          line-height: 1.6;
          margin-bottom: 0.8rem;
        }

        .donate-stripe-note {
          font-size: 12px;
          color: var(--text3);
          text-align: center;
        }

        .donate-stripe-note a {
          color: var(--gold2);
          text-decoration: none;
        }

        .donate-stripe-note a:hover {
          text-decoration: underline;
        }

        /* ── Responsive ──────────────────────────────────────────────────── */

        @media (max-width: 900px) {
          .donate-grid {
            grid-template-columns: 1fr;
          }
          .donate-right {
            position: static;
          }
          .tier-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .donate-hero-inner {
            padding: 0 1.5rem;
          }
          .donate-grid {
            padding: 0 1.5rem;
          }
          .tier-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .mode-toggle {
            width: 100%;
          }
          .mode-btn {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .tier-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
