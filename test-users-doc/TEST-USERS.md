# VidyaSutra test students

Six invented students with different profiles. Every PDF is a watermarked sample, not a real document.

## How to set one up

1. Open the app and choose **Create a student account**. Use the email and password below.
2. Open **Profile**, enter the values from the table and save.
3. Open **Documents** and upload the PDFs from that student's folder.

Ananya Rao already exists in the demo data, so skip steps 1 and 2 for her.

The expected results assume the eight demo scholarships that ship with the build.

## 1. Ananya Rao

**What this student shows:** The full journey: apply, upload, review, approval.

| | |
|---|---|
| Email | `student@vidyasutra.test` |
| Password | `Student@12345` (already in the demo data) |
| Folder | `1-ananya-rao` |

| Profile field | Value |
|---|---|
| Level of study | UG |
| Stream | Engineering |
| Year of study | 2 |
| CGPA | 8.2 |
| Annual family income | 600000 |
| Category | OBC |
| Gender | Female |
| State of domicile | Karnataka |
| Person with disability | No |

**Documents in the folder (6):** Marks card, Income certificate, Government ID proof, Caste certificate, Bonafide certificate, Recommendation letter

| Expected group | Scholarships |
|---|---|
| You qualify | Merit Award, Women in Technology Grant, Post-Matric Support for Backward Classes |
| Almost there | Means-Based Study Scholarship, Postgraduate Research Fellowship |
| Not a match | Founders Excellence, Students with Disabilities |

## 2. Rahul Verma

**What this student shows:** A student who qualifies for nothing yet, with the exact reasons.

| | |
|---|---|
| Email | `rahul@vidyasutra.test` |
| Password | `Test@12345` |
| Folder | `2-rahul-verma` |

| Profile field | Value |
|---|---|
| Level of study | UG |
| Stream | Commerce |
| Year of study | 1 |
| CGPA | 6.5 |
| Annual family income | 900000 |
| Category | General |
| Gender | Male |
| State of domicile | Maharashtra |
| Person with disability | No |

**Documents in the folder (2):** Marks card, Government ID proof

| Expected group | Scholarships |
|---|---|
| You qualify | None |
| Almost there | Merit Award (CGPA 1 short), Means-Based Study Scholarship (income Rs. 4,00,000 over) |
| Not a match | The other five |

## 3. Meera Nair

**What this student shows:** A strong postgraduate who qualifies for four schemes, including the research fellowship.

| | |
|---|---|
| Email | `meera@vidyasutra.test` |
| Password | `Test@12345` |
| Folder | `3-meera-nair` |

| Profile field | Value |
|---|---|
| Level of study | PG |
| Stream | Science |
| Year of study | 1 |
| CGPA | 8.6 |
| Annual family income | 450000 |
| Category | General |
| Gender | Female |
| State of domicile | Kerala |
| Person with disability | No |

**Documents in the folder (5):** Marks card, Income certificate, Government ID proof, Bonafide certificate, Recommendation letter

| Expected group | Scholarships |
|---|---|
| You qualify | Merit Award, Women in Technology Grant, Means-Based Study Scholarship, Postgraduate Research Fellowship |
| Almost there | None |
| Not a match | Backward Classes, Founders Excellence, Students with Disabilities |

## 4. Kiran Gowda

**What this student shows:** A top scorer: merit schemes open, income-based schemes do not.

| | |
|---|---|
| Email | `kiran@vidyasutra.test` |
| Password | `Test@12345` |
| Folder | `4-kiran-gowda` |

| Profile field | Value |
|---|---|
| Level of study | UG |
| Stream | Engineering |
| Year of study | 4 |
| CGPA | 9.3 |
| Annual family income | 1200000 |
| Category | General |
| Gender | Male |
| State of domicile | Karnataka |
| Person with disability | No |

**Documents in the folder (3):** Marks card, Government ID proof, Bonafide certificate

| Expected group | Scholarships |
|---|---|
| You qualify | Merit Award, Founders Excellence Scholarship |
| Almost there | Women in Technology Grant, Means-Based Study Scholarship, Postgraduate Research Fellowship |
| Not a match | Backward Classes, Students with Disabilities |

## 5. Divya Shetty

**What this student shows:** Category, income and disability rules. Merit Award is missed by 0.3 CGPA.

| | |
|---|---|
| Email | `divya@vidyasutra.test` |
| Password | `Test@12345` |
| Folder | `5-divya-shetty` |

| Profile field | Value |
|---|---|
| Level of study | UG |
| Stream | Arts |
| Year of study | 2 |
| CGPA | 7.2 |
| Annual family income | 300000 |
| Category | SC |
| Gender | Female |
| State of domicile | Karnataka |
| Person with disability | Yes |

**Documents in the folder (5):** Marks card, Income certificate, Government ID proof, Caste certificate, Disability certificate

| Expected group | Scholarships |
|---|---|
| You qualify | Post-Matric Support for Backward Classes, Means-Based Study Scholarship, Students with Disabilities |
| Almost there | Merit Award (CGPA 0.3 short), Women in Technology Grant (stream) |
| Not a match | Postgraduate Research Fellowship, Founders Excellence |

## 6. Suresh Patil

**What this student shows:** The missing-document edge case: he qualifies for two schemes but has only two documents, so Submit stays blocked.

| | |
|---|---|
| Email | `suresh@vidyasutra.test` |
| Password | `Test@12345` |
| Folder | `6-suresh-patil` |

| Profile field | Value |
|---|---|
| Level of study | Diploma |
| Stream | Engineering |
| Year of study | 3 |
| CGPA | 7.8 |
| Annual family income | 250000 |
| Category | ST |
| Gender | Male |
| State of domicile | Karnataka |
| Person with disability | No |

**Documents in the folder (2):** Marks card, Caste certificate

| Expected group | Scholarships |
|---|---|
| You qualify | Post-Matric Support for Backward Classes, Means-Based Study Scholarship |
| Almost there | Merit Award, Women in Technology Grant, Founders Excellence |
| Not a match | Postgraduate Research Fellowship, Students with Disabilities |
