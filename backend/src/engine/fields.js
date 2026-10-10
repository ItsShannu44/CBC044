// The profile fields that eligibility rules can refer to.
// The student profile form, the admin rule builder and the rule engine all read this one list,
// so adding a field here is enough to make it usable everywhere.

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
];

export const FIELDS = {
  level: { label: 'Level of study', type: 'enum', options: ['Diploma', 'UG', 'PG', 'PhD'], group: 'Academic' },
  stream: {
    label: 'Stream',
    type: 'enum',
    options: ['Engineering', 'Medical', 'Science', 'Commerce', 'Arts', 'Law', 'Management', 'Other'],
    group: 'Academic',
  },
  yearOfStudy: { label: 'Year of study', type: 'number', min: 1, max: 6, step: 1, group: 'Academic' },
  cgpa: { label: 'CGPA', type: 'number', min: 0, max: 10, step: 0.01, group: 'Academic', hint: 'On a 10-point scale' },
  familyIncome: {
    label: 'Annual family income',
    type: 'currency',
    min: 0,
    step: 1000,
    group: 'Personal',
    hint: 'In rupees, as on your income certificate',
  },
  category: { label: 'Category', type: 'enum', options: ['General', 'OBC', 'SC', 'ST', 'EWS'], group: 'Personal' },
  gender: { label: 'Gender', type: 'enum', options: ['Female', 'Male', 'Other'], group: 'Personal' },
  state: { label: 'State of domicile', type: 'enum', options: STATES, group: 'Personal' },
  disability: { label: 'Person with disability', type: 'boolean', group: 'Personal' },
};

// Which comparisons make sense for each kind of field.
export const OPERATORS = {
  gte: { label: 'is at least', types: ['number', 'currency'] },
  lte: { label: 'is at most', types: ['number', 'currency'] },
  eq: { label: 'is', types: ['number', 'currency', 'enum', 'boolean'] },
  neq: { label: 'is not', types: ['enum'] },
  in: { label: 'is one of', types: ['enum'] },
};

export const DOC_TYPES = {
  MARKS_CARD: 'Latest marks card',
  INCOME_CERTIFICATE: 'Income certificate',
  ID_PROOF: 'Government ID proof',
  CASTE_CERTIFICATE: 'Caste certificate',
  BONAFIDE_CERTIFICATE: 'Bonafide certificate',
  DOMICILE_CERTIFICATE: 'Domicile certificate',
  DISABILITY_CERTIFICATE: 'Disability certificate',
  BANK_PASSBOOK: 'Bank passbook front page',
  RECOMMENDATION_LETTER: 'Recommendation letter',
};

export const PROFILE_KEYS = Object.keys(FIELDS);
