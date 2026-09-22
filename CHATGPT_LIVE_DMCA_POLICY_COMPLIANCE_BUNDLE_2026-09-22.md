# Live DMCA Policy Compliance Bundle — 2026-09-22

## Scope

Read-only inspection of public `https://muse.wyzdesign.com/dmca` on
2026-09-22, compared with the U.S. Copyright Office’s published section 512
guidance. This is an implementation/release finding, **not legal advice**;
obtain counsel’s review before representing safe-harbor compliance.

## P0/P1 legal-operational gaps

### DMCA-01 — Public designated-agent contact omits a phone number

The live page identifies a person, street address, an apparent registration
number, and `dmca@wyzdesign.com`, but displays no telephone number and has no
`tel:` link. The Copyright Office states that a service provider seeking the
section 512(c) safe harbor must make agent name, physical/street or PO-box
address, **telephone number**, and email available through its publicly
accessible service, and keep website and directory information current.

Required action:

1. Have counsel/authorized owner verify the current Copyright Office directory
   listing, legal service-provider name, all alternate names/URLs/apps, agent
   identity, physical address, phone, and email.
2. Publish the accurate phone number alongside the other designated-agent
   contact data if appropriate, and implement a documented renewal/update
   control.
3. Do not invent, retain, or display a registration number unless it matches
   the current official designation.

### DMCA-02 — Counter-notice guidance is materially abbreviated

The public page says a counter-notice needs a signature, identification of
material, a perjury statement, and consent to jurisdiction. It does not state
that an effective counter notification should include the subscriber’s name,
address, and phone number, a good-faith mistake/misidentification statement,
consent to the jurisdiction of the Federal District Court for the subscriber’s
address (or applicable court), and acceptance of service from the complainant
or agent. It also says only “unless the original complainant files a court
action,” which is less precise than the statutory court-order restraint
condition.

Required action: counsel should replace the abbreviated text with a reviewed,
current section-512-compliant notice/counter-notice template and operational
SOP covering receipt, prompt subscriber notice, content preservation,
expeditious action, counter-notice forwarding, restoration window, audit trail,
and repeat-infringer policy application.

### DMCA-03 — Canonical metadata incorrectly points public DMCA page at `/muse`

The live page has a semantic `<main>` landmark, but its rendered metadata is:

- robots: `index, follow`
- canonical: `https://www.wyzdesign.com/muse`

For a public DMCA policy, indexing is expected, but canonical must identify the
DMCA document itself (or be intentionally omitted), not the authenticated
application root. This can cause search engines to collapse/suppress the legal
policy or treat it as duplicate application content.

## Verification gate

Before launch, wyzmind must obtain counsel/authorized-owner signoff on DMCA
text and designated-agent details, deploy it, then verify the public rendered
page has correct content, a valid `/dmca` canonical, and working accessible
contact link(s). Keep the public DMCA route indexable while retaining noindex
on authenticated/admin application routes.

## Authoritative references

- [U.S. Copyright Office — DMCA Designated Agent Directory](https://www.copyright.gov/dmca-directory/)
- [17 U.S.C. § 512, Chapter 5](https://www.copyright.gov/title17/92chap5.html)
- [37 CFR § 201.38](https://www.copyright.gov/title37/201/37cfr201-38.html)
