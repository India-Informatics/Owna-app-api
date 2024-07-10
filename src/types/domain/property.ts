export type Address = {
  streetType: string
  countryISO: string
  fullAddress: string
  postCode: string
  streetName: string
  streetNumber: string
  suburb: string
  territorialAuthorityName: string
  territorialAuthorityType: string
}

export enum PropertyType {
  House = 'house',
  Apartment = 'apartment',
  Unit = 'unit',
}

export type Area = {
  unit: string
  value: number
}

export type Valuation = {
  date: Date
  value: number
}

export type TotalInvestmentFigures = {
  annualRental: number
  annualTotalCost: number
  annualNetCashflow: number
}

export type Investment = {
  annualYield: number
  weeklyRent: number
  weeklyBodyCorpFees: number
  weeklyPropertyManagementFees: number
  weeklyRates: number
  totalFigures?: TotalInvestmentFigures
}
