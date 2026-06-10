'use client';

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type DonationMode = 'one-time' | 'monthly';
type DonorType = 'alumni' | 'parent' | 'student' | 'faculty' | 'other';

interface Tier {
  amount: number;
  label: string;
  club?: string;
  clubDesc?: string;
  featured?: boolean;
}

// ─── Tier Data ────────────────────────────────────────────────────────────────

const ONE_TIME_TIERS: Tier[] = [
  { amount: 250,  label: 'Builder' },
  { amount: 500,  label: 'Patron' },
  { amount: 1000, label: 'Legacy Donor' },
  { amount: 2500, label: 'Founders Circle' },
  { amount: 5000, label: 'Visionary Circle' },
];

const ONE_TIME_CLUB: Tier = {
  amount: 190.60,
  label: '1906 Club',
  club: '1906 Club',
  clubDesc: 'Annual legacy giving circle — $190.60/year',
  featured: true,
};

const MONTHLY_TIERS: Tier[] = [
  { amount: 10,  label: 'Supporter' },
  { amount: 25,  label: 'Builder' },
  { amount: 50,  label: 'Patron' },
  { amount: 100, label: 'Leadership Circle' },
  { amount: 222, label: 'Premier Alumni Circle', club: '222 Club', clubDesc: 'Premier sustaining alumni membership', featured: true },
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
  const [selectedClub, setSelectedClub] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Tax deductible — default to false (No)
  const [wantsTaxDeductible, setWantsTaxDeductible] = useState(false);
  const [taxInterestName, setTaxInterestName] = useState('');
  const [taxInterestAmount, setTaxInterestAmount] = useState('');

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

  function handleModeSwitch(newMode: DonationMode) {
    setMode(newMode);
    setSelectedTier(null);
    setSelectedClub(false);
    setUseCustom(false);
    setCustomAmount('');
  }

  function handleTaxToggle(val: boolean) {
    setWantsTaxDeductible(val);
    setSelectedTier(null);
    setSelectedClub(false);
    setUseCustom(false);
    setCustomAmount('');
  }

  function getSelectedAmount(): number | null {
    if (useCustom) {
      const n = parseFloat(customAmount);
      return isNaN(n) || n <= 0 ? null : n;
    }
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
    if (donorType === "alumni") {
      const year = Number(gradYear);
      if (
        !gradYear.trim() ||
        year < 1906 ||
        year > new Date().getFullYear() + 5
      ) {
        newErrors.gradYear = "Enter a valid graduation year.";
      }
    }
    if (!selectedTier && !selectedClub && !useCustom) newErrors.tier = 'Please select a giving level.';
    if (useCustom) {
      const n = parseFloat(customAmount);
      if (isNaN(n) || n <= 0) newErrors.tier = 'Please enter a valid custom amount.';
      else if (!wantsTaxDeductible && mode === 'one-time' && n < 250) newErrors.tier = 'One-time gifts must be $250 or more.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // FIX: removed the stray `}` that was closing the component early,
  // causing `mode` and `getTotalAmount` to be out of scope below it.
  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const amount = getTotalAmount();

      if (!amount) {
        setIsSubmitting(false);
        return;
      }

      const tierLabel = useCustom
        ? "Custom"
        : selectedClub
        ? mode === "one-time"
          ? "1906 Club"
          : "222 Club"
        : mode === "one-time"
        ? ONE_TIME_TIERS.find(t => t.amount === selectedTier)?.label
        : MONTHLY_TIERS.find(t => t.amount === selectedTier)?.label;

      const donationPayload = {
        mode: mode === "monthly" ? "monthly" : "one_time",
        amount_cents: Math.round(amount * 100),
        tier_label: tierLabel,
        is_1906_club: tierLabel === "1906 Club",
        is_222_club: tierLabel === "222 Club",
        is_custom_amount: useCustom,
        cover_fees: coverFees,
        full_name: fullName,
        email,
        donor_type: donorType,
        graduation_year: donorType === "alumni" ? Number(gradYear) : null,
        affiliation_notes: affiliation || null,
        show_on_wall: anonymous ? false : showOnWall,
        anonymous,
        message: message || null,
        status: "pending"
      };

      const { data: donation, error: donationError } = await supabase
        .from("donations")
        .insert(donationPayload)
        .select()
        .single();

      if (donationError) {
        console.error(donationError);
        alert("Unable to create donation.");
        setIsSubmitting(false);
        return;
      }

      const checkoutResponse = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: donation.id })
      });

      const checkoutData = await checkoutResponse.json();

      if (!checkoutResponse.ok || !checkoutData.url) {
        throw new Error("Unable to create checkout session");
      }

      window.location.href = checkoutData.url;
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const currentTiers = mode === 'monthly' ? MONTHLY_TIERS : ONE_TIME_TIERS;
  const total = getTotalAmount();

  return (
    <div>
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav>
        <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => { window.location.href = '/'; }}>
          <Image className="nav-crest" src="/assets/crest.png" alt="Crest" width={40} height={40} />
          <div className="nav-txt">
            <div className="nav-name">Renew 222</div>
            <div className="nav-sub">Acacia Wisconsin</div>
          </div>
        </div>
        <ul className="nav-links">
          <li><Link href="/#mission">Our Mission</Link></li>
          <li><Link href="/#history">Our History</Link></li>
          <li><Link href="/#impact">Impact</Link></li>
          <li><Link href="/#support">Support</Link></li>
        </ul>
        <Link href="/donate" className="nav-give">Give Now</Link>
      </nav>

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        {!wantsTaxDeductible && (
          <section className="donate-hero">
            <div className="donate-hero-inner">
              <div className="section-eyebrow" style={{ marginBottom: '1.2rem' }}>
                <div className="eyebrow-rule" />
                <div className="eyebrow-txt">Alumni Giving Campaign</div>
              </div>
              <h1 className="donate-hero-title">Make Your Gift to <em>Renew 222</em></h1>
              <p className="donate-hero-lead">
                Your support preserves 222 Langdon Street for the next century of brotherhood.
                Choose a giving level below — every gift is an investment in a chapter that has endured since 1906.
              </p>
            </div>
          </section>
        )}

        {/* ── GIVING FORM ──────────────────────────────────────────────────── */}
        <section className={wantsTaxDeductible ? 'donate-section donate-section--fullscreen' : 'donate-section'}>
          <div className={wantsTaxDeductible ? 'donate-grid donate-grid--fullscreen' : 'donate-grid'}>

            {/* ── LEFT ── */}
            <div className={wantsTaxDeductible ? 'tax-form-card' : 'donate-left'}>

              {/* ── 1. TAX DEDUCTIBLE TOGGLE ── */}
              <div className="donate-block">
                <div className="donate-block-label">Tax Deductible Giving</div>
                <div className="tax-toggle-card">
                  <div className="tax-toggle-header">
                    <div className="tax-toggle-question">
                      Would you like a tax-deductible gift?
                    </div>
                    <div className="tax-toggle-btns">
                      <button
                        type="button"
                        className={`tax-btn${wantsTaxDeductible === true ? ' tax-btn--active' : ''}`}
                        onClick={() => handleTaxToggle(true)}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`tax-btn${wantsTaxDeductible === false ? ' tax-btn--no' : ''}`}
                        onClick={() => handleTaxToggle(false)}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {wantsTaxDeductible === false && (
                    <p className="tax-note tax-note--muted">
                      Your gift goes directly to the chapter. Tax deductibility not required.
                    </p>
                  )}
                </div>
              </div>

              {/* ── TAX YES: show only the interest form ── */}
              {wantsTaxDeductible === true && (
                <div className="tax-standalone-form">
                  <div className="tax-interest-banner">
                    <span className="tax-interest-icon">🏛</span>
                    <div>
                      <div className="tax-interest-headline">We&apos;re gauging interest</div>
                      <div className="tax-interest-body">
                        Tax-deductible giving isn&apos;t available yet. We&apos;re collecting alumni
                        interest before pursuing 501(c)(3) status. Your info below helps us
                        build that case — and we&apos;ll notify you when it becomes available.
                      </div>
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="taxName">
                      Your Name
                    </label>
                    <input
                      id="taxName"
                      type="text"
                      className={`field-input${errors.taxName ? ' field-input--error' : ''}`}
                      value={taxInterestName}
                      onChange={e => setTaxInterestName(e.target.value)}
                      placeholder="e.g. James R. Mitchell"
                    />
                    {errors.taxName && <div className="field-error">{errors.taxName}</div>}
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="taxEmail">
                      Email Address
                    </label>
                    <input
                      id="taxEmail"
                      type="email"
                      className={`field-input${errors.taxEmail ? ' field-input--error' : ''}`}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                    {errors.taxEmail && <div className="field-error">{errors.taxEmail}</div>}
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="taxInterestAmt">
                      How much would you donate if tax deductible?{' '}
                      <span className="field-optional">(optional)</span>
                    </label>
                    <div className="tax-amount-wrap">
                      <span className="tax-amount-prefix">$</span>
                      <input
                        id="taxInterestAmt"
                        type="number"
                        min="0"
                        className="field-input tax-amount-input"
                        value={taxInterestAmount}
                        onChange={e => setTaxInterestAmount(e.target.value)}
                        placeholder="e.g. 1000"
                      />
                    </div>
                    <div className="tax-amount-note">
                      Helps us quantify potential impact and make the case for pursuing tax-deductible status.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-gold donate-submit-btn"
                    disabled={isSubmitting}
                    onClick={async () => {
                      const errs: Record<string, string> = {};
                      if (!taxInterestName.trim()) errs.taxName = 'Name is required.';
                      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.taxEmail = 'A valid email is required.';
                      setErrors(errs);
                      if (Object.keys(errs).length > 0) return;
                      setIsSubmitting(true);
                      const { error } = await supabase
                        .from("tax_interest_submissions")
                        .insert({
                          full_name: taxInterestName,
                          email,
                          potential_amount_dollars: taxInterestAmount ? Number(taxInterestAmount) : null
                        });

                      if (error) {
                        alert("Unable to save your response.");
                        setIsSubmitting(false);
                        return;
                      }

                      alert(
                        "Thank you! We've recorded your interest and will reach out when tax-deductible giving becomes available."
                      );
                    }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit Interest →'}
                  </button>

                  <p className="donate-secure-note" style={{ marginTop: '1rem' }}>
                    🔒 Your information is kept private and only used to contact you about this campaign.
                  </p>
                </div>
              )}

              {/* ── NORMAL DONATION FLOW (only when tax = No) ── */}
              {wantsTaxDeductible === false && (<>

                {/* ── 2. GIVING TYPE TOGGLE ── */}
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
                    <p className="mode-note">Sustaining gifts renew automatically each month and can be cancelled at any time.</p>
                  )}
                </div>

                {/* ── 3. TIER SELECTION ── */}
                <div className="donate-block">
                  <div className="donate-block-label">
                    {mode === 'one-time' ? 'Annual & Legacy Giving' : 'Monthly Sustaining Giving'}
                  </div>
                  {errors.tier && <div className="field-error">{errors.tier}</div>}

                  <>
                    <div className="tier-grid">
                      {currentTiers.map((tier) => {
                        const isSelected = selectedTier === tier.amount && !selectedClub && !useCustom;
                        const isFeaturedClub = tier.featured && mode === 'monthly';
                        return (
                          <button
                            key={tier.amount}
                            type="button"
                            className={`tier-card${isSelected ? ' tier-card--selected' : ''}${isFeaturedClub ? ' tier-card--club' : ''}`}
                            onClick={() => { setSelectedTier(tier.amount); setSelectedClub(false); setUseCustom(false); setCustomAmount(''); }}
                          >
                            {isFeaturedClub && <span className="tier-club-badge">222 Club</span>}
                            <span className="tier-amount">{formatAmount(tier.amount, mode)}</span>
                            <span className="tier-label">{tier.label}</span>
                            {isFeaturedClub && tier.clubDesc && <span className="tier-club-desc">{tier.clubDesc}</span>}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className={`tier-card tier-card--other${useCustom ? ' tier-card--selected' : ''}`}
                        onClick={() => { setUseCustom(true); setSelectedTier(null); setSelectedClub(false); }}
                      >
                        <span className="tier-amount">Other</span>
                        <span className="tier-label">Custom Amount</span>
                      </button>
                    </div>

                    {mode === 'one-time' && (
                      <button
                        type="button"
                        className={`club-card${selectedClub ? ' club-card--selected' : ''}`}
                        onClick={() => { setSelectedClub(!selectedClub); setSelectedTier(null); setUseCustom(false); setCustomAmount(''); }}
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
                  </>

                  {useCustom && (
                    <div className="custom-amount-block">
                      <label className="field-label" htmlFor="customAmt">
                        Enter your amount
                        {mode === 'one-time' && (
                          <span className="field-optional"> (min. $250 for one-time)</span>
                        )}
                      </label>
                      <div className="tax-amount-wrap">
                        <span className="tax-amount-prefix">$</span>
                        <input
                          id="customAmt"
                          type="number"
                          min="1"
                          className="field-input tax-amount-input"
                          value={customAmount}
                          onChange={e => setCustomAmount(e.target.value)}
                          placeholder={mode === 'one-time' ? '250' : '10'}
                          autoFocus
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 4. FEE COVERAGE ── */}
                {(selectedTier || selectedClub || useCustom) && (
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

                {/* ── 5. RECOGNITION ── */}
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
                        onChange={e => { setAnonymous(e.target.checked); if (e.target.checked) setShowOnWall(false); }}
                      />
                      <span className="checkbox-label">Donate anonymously</span>
                    </label>
                  </div>
                </div>

                {/* ── 6. MESSAGE ── */}
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

              </>)} {/* end normal donation flow */}

            </div>

            {/* ── RIGHT — Donor info + summary (hidden in tax-yes mode) ── */}
            {wantsTaxDeductible === false && (
              <div className="donate-right">

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
                          {useCustom ? 'Custom' : selectedClub
                            ? (mode === 'one-time' ? '1906 Club' : '222 Club')
                            : currentTiers.find(t => t.amount === selectedTier)?.label ?? `$${selectedTier}`}
                        </span>
                      </div>
                      <div className="gift-summary-row">
                        <span>Base amount</span>
                        <span>{mode === 'monthly' ? `$${getSelectedAmount()}/mo` : `$${getSelectedAmount()?.toLocaleString()}`}</span>
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
                        <div className="gift-summary-note">Billed monthly · Cancel anytime</div>
                      )}
                    </>
                  ) : (
                    <div className="gift-summary-empty">Select a giving level to see your summary</div>
                  )}
                </div>

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

                <div className="donate-stripe-note">
                  <span>Questions? Email </span>
                  <a href="mailto:alumni@acaciawisconsin.org">alumni@acaciawisconsin.org</a>
                </div>
              </div>
            )} {/* end right column */}

          </div>
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer>
        <Image className="ft-crest" src="/assets/crest.png" alt="Crest" width={48} height={48} />
        <div className="ft-name">Renew 222</div>
        <div className="ft-tag">Acacia Wisconsin House Corporation · Est. 1906 · Madison, Wisconsin</div>
        <div className="ft-links">
          <Link href="/#mission">Our Mission</Link>
          <Link href="/#history">History</Link>
          <Link href="/#support">Support</Link>
        </div>
        <div className="ft-copy"></div>
      </footer>

      <style>{`
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

        .donate-section {
          padding: 4rem 0 6rem;
          background: linear-gradient(180deg, var(--bg3) 0%, var(--bg) 100%);
        }
        .donate-section--fullscreen {
          padding: 0;
          min-height: calc(100vh - 72px);
          display: flex;
          flex-direction: column;
          background: linear-gradient(160deg, var(--bg2) 0%, var(--bg3) 50%, var(--bg) 100%);
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
        .donate-grid--fullscreen {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          width: 100%;
          box-sizing: border-box;
        }

        .donate-block { margin-bottom: 2.5rem; }
        .donate-block-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold2);
          font-weight: 700;
          margin-bottom: 1rem;
          font-family: 'Georgia', serif;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .tax-unlocked-badge {
          background: rgba(122, 179, 224, 0.15);
          border: 1px solid rgba(122, 179, 224, 0.35);
          color: #7ab3e0;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 20px;
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        .mode-toggle {
          display: flex;
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
        .mode-btn:first-child { border-right: 1px solid var(--border); }
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
        .tier-card--other {
          border-style: dashed;
          border-color: rgba(182, 145, 74, 0.35);
        }
        .tier-card--other:hover, .tier-card--other.tier-card--selected {
          border-style: solid;
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

        .custom-amount-block {
          margin-top: 1rem;
          animation: slideDown 0.2s ease;
        }

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

        .recognition-options { display: flex; flex-direction: column; gap: 0.75rem; }
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
        .checkbox-label { font-size: 13px; color: var(--text2); line-height: 1.5; }
        .fee-note { color: var(--gold2); font-weight: 600; }

        .field-group { margin-bottom: 1.4rem; }
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
        .field-required { color: #c87941; }
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
        .field-input:focus, .field-select:focus, .field-textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(182, 145, 74, 0.15);
        }
        .field-input--error { border-color: #c87941 !important; }
        .field-error { font-size: 12px; color: #c87941; margin-top: 0.4rem; font-style: italic; }
        .field-textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
        .field-input::placeholder, .field-textarea::placeholder { color: var(--text3); opacity: 0.6; }

        .donate-right { position: sticky; top: 90px; }
        .donate-info-card {
          background: linear-gradient(180deg, rgba(20, 18, 15, 0.8) 0%, rgba(25, 23, 20, 0.75) 100%);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 2rem 2rem 0.5rem;
          margin-bottom: 1.8rem;
        }
        .alumni-fields {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          animation: slideDown 0.25s ease;
        }

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
        .gift-summary-row:last-child { border-bottom: none; }
        .gift-summary-row--fee { color: var(--text3); font-size: 12px; }
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

        .donate-submit-btn {
          width: 100%;
          padding: 16px;
          font-size: 13px;
          border-radius: 4px;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .donate-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
        .donate-secure-note {
          font-size: 11px;
          color: var(--text3);
          text-align: center;
          line-height: 1.6;
          margin-bottom: 0.8rem;
        }
        .donate-stripe-note { font-size: 12px; color: var(--text3); text-align: center; }
        .donate-stripe-note a { color: var(--gold2); }
        .donate-stripe-note a:hover { text-decoration: underline; }

        .tax-standalone-form { animation: slideDown 0.25s ease; }
        .tax-form-card {
          background: linear-gradient(180deg, rgba(20,18,15,0.92) 0%, rgba(25,23,20,0.88) 100%);
          border: 1px solid var(--border);
          border-top: 3px solid var(--gold);
          border-radius: 12px;
          padding: 3rem 3.5rem;
          width: 100%;
          max-width: 560px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
        }
        .tax-form-card .tax-interest-banner { margin-bottom: 2rem; }
        .tax-form-card .donate-submit-btn { margin-top: 0.5rem; }

        .tax-toggle-card {
          background: rgba(15, 13, 10, 0.5);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.5rem;
        }
        .tax-toggle-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .tax-toggle-question { font-size: 14px; color: var(--text2); font-weight: 500; line-height: 1.5; }
        .tax-toggle-btns {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .tax-btn {
          background: transparent;
          border: none;
          padding: 8px 22px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text3);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Georgia', serif;
        }
        .tax-btn:first-child { border-right: 1px solid var(--border); }
        .tax-btn--active {
          background: linear-gradient(135deg, var(--gold), var(--gold2));
          color: #0f0d0a;
        }
        .tax-btn--no { background: rgba(255,255,255,0.06); color: var(--text2); }
        .tax-note {
          margin-top: 1rem;
          font-size: 13px;
          line-height: 1.65;
          border-radius: 4px;
          padding: 0.9rem 1.1rem;
        }
        .tax-note--muted {
          color: var(--text3);
          background: rgba(255,255,255,0.03);
          border-left: 3px solid var(--border);
        }
        .tax-interest-form { margin-top: 1.2rem; animation: slideDown 0.25s ease; }
        .tax-interest-banner {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          background: rgba(27, 77, 122, 0.12);
          border: 1px solid rgba(27, 77, 122, 0.3);
          border-left: 4px solid #1b4d7a;
          border-radius: 6px;
          padding: 1.1rem 1.2rem;
        }
        .tax-interest-icon { font-size: 1.4rem; line-height: 1; flex-shrink: 0; margin-top: 2px; }
        .tax-interest-headline {
          font-size: 11px;
          font-weight: 700;
          color: #7ab3e0;
          letter-spacing: 0.1em;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
        }
        .tax-interest-body { font-size: 13px; color: var(--text2); line-height: 1.65; font-weight: 300; }
        .tax-still-give {
          margin-top: 1rem;
          font-size: 12px;
          color: var(--text3);
          line-height: 1.6;
          font-style: italic;
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
        }
        .tax-amount-wrap { position: relative; display: flex; align-items: center; }
        .tax-amount-prefix {
          position: absolute;
          left: 14px;
          color: var(--gold2);
          font-family: 'Georgia', serif;
          font-size: 14px;
          pointer-events: none;
          z-index: 1;
        }
        .tax-amount-input { padding-left: 28px !important; }
        .tax-amount-input::-webkit-inner-spin-button,
        .tax-amount-input::-webkit-outer-spin-button { opacity: 0.4; }
        .tax-amount-note {
          margin-top: 0.5rem;
          font-size: 11px;
          color: var(--text3);
          line-height: 1.55;
          font-style: italic;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .donate-grid { grid-template-columns: 1fr; }
          .donate-right { position: static; }
          .tier-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .donate-hero-inner { padding: 0 1.5rem; }
          .donate-grid { padding: 0 1.5rem; }
          .mode-toggle { width: 100%; }
          .mode-btn { flex: 1; }
        }
        @media (max-width: 480px) {
          .tier-grid { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
}