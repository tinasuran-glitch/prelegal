export type MndaTermType = "expires" | "continues";
export type ConfidentialityTermType = "years" | "perpetuity";

export interface NdaFormData {
  party1Name: string;
  party1Title: string;
  party1Company: string;
  party1NoticeAddress: string;
  party2Name: string;
  party2Title: string;
  party2Company: string;
  party2NoticeAddress: string;
  purpose: string;
  effectiveDate: string;
  mndaTermType: MndaTermType;
  mndaTermYears: string;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

export interface NdaResult {
  coverPage: string;
  standardTerms: string;
  error?: string;
}
