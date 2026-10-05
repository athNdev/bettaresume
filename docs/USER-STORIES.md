# User stories, and the resumes built from them

These personas exist to answer one question honestly: **does this product actually fit the people
who need a résumé?** Every resume below was created through the app's own tRPC API — same
validation, same schema, same code path the editor uses — rather than written as JSON fixtures. A
persona the data model cannot express is a finding, not a formatting problem.

Each story is deliberately awkward in a different way, so the fit test has something to fail on.

---

## Story 1 — Amara Okafor, 34. Platform engineer, mid-career, two employers, one long gap

> "I got laid off in 2022 and it shows. I have three years of freelance between jobs and I have
> never once been able to make that read as anything other than a hole. I also have a job I love
> that I would never leave, so the 'current' flag on my last role matters more than anything else
> on the page."

**Awkward on purpose:** an employment gap, a contract/freelance engagement that is not a normal
employment, and a current role that must render with no end date.

**Target role:** Senior Platform Engineer, Infrastructure & Reliability.

**Exercises:** personal-info, summary, experience (3, including a contract and a current role),
skills (3 categories with levels and years), projects, certifications (with credential IDs and
expiry), awards.

---

## Story 2 — Dr. Priya Raghunathan, 41. Research scientist, applying to a faculty position

> "I need a CV, not a résumé, and the thing I care about most is that my publications are
> first-class — with a link to the DOI. I also have a grant I led that is not a job and not a
> degree, and I have never known where that goes."

**Awkward on purpose:** an academic CV where publications outrank employment, a leadership grant
that does not fit "experience", and a very long publication list.

**Target role:** Faculty position, Computational Biology.

**Exercises:** personal-info (with ORCID-style identifiers), summary, education (with GPA,
honours, coursework), publications (many, with DOIs), experience (grant leadership as a distinct
entry), awards, languages, skills (Methods / Tools / Supervision categories).

---

## Story 3 — Tomas Beck, 22. Undergraduate, first internship, needs three versions of one résumé

> "I have one résumé and three different things to apply to. I do not want three separate
> documents — I want one and then small changes, because last time I made three I forgot to update
> my phone number in two of them."

**Awkward on purpose:** variation management, a résumé with no experience yet, and the gap between
"student" framing and "industry" framing.

**Target roles:** Software Engineering Intern (three variations of one base résumé).

**Exercises:** base résumé + two `variation` resumes, personal-info, education (current, in-progress
degree), skills (student-level), projects (with GitHub URLs), volunteer.

---

## Story 4 — Nadia Haddad, 29. Career changer, hospitality → data analytics

> "I spent six years in hotels. I know what I did was real work and I know nobody scanning a PDF is
> going to give it to me. I have a bootcamp certificate, some freelance dashboards, and I need the
> version of my story that does not apologise for the first six years."

**Awkward on purpose:** a complete career change, transferable skills that have no technical name,
and a credential from a non-degree program that is not a "certification" in the traditional sense.

**Target role:** Junior Data Analyst.

**Exercises:** personal-info, summary, experience (hospitality, with highlights rather than tech
bullets), education, skills (transferable / technical / tools), projects (freelance dashboards),
certifications, languages (bilingual — genuinely relevant here), custom section (an
"Additional context" section that is not a standard type).

---

## What "fits" has to mean

For each persona, the resume is a fit when:

1. **Every fact survives.** Nothing in the story had to be deleted, reworded into vagueness, or
   moved into a section where it reads as something it isn't.
2. **Every section type carries its weight.** A section that renders but conveys nothing is a
   layout bug wearing a content costume.
3. **The awkward parts are representable.** A gap, a grant, a career change, a third variation.
4. **The export survives.** A résumé that looks right on screen and breaks in the PDF is not a fit.

The results of that test are in [`docs/PERSONA-FIT-REPORT.md`](./PERSONA-FIT-REPORT.md).
