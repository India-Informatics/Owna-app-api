import {
  Address,
  Area,
  Fraction,
  Investment,
  PropertyType,
  Valuation,
} from '../../../types/domain'

export class CreatePropertyDto {
  fractions: Fraction
  investment: Investment
  address: Address
  propertyType: PropertyType
  floorArea: Area
  landArea: Area
  numberOfBedrooms: number
  numberOfBathrooms: number
  numberOfParkingSpaces: number
  laundry: boolean
  garage: boolean
  outdoorSpace: boolean
  deck: boolean
  condition: string
  insulation: string[]
  heating: string[]
  internet: string
  valuations: Valuation[]
  externalRef: string
  imagesUris: string[]
}
