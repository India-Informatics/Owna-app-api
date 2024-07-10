import { chain } from 'mathjs'

import { ResourceUpdateException } from '../../../tools/exceptions'
import {
  Address,
  Area,
  Fraction,
  Investment,
  PropertyType,
  Valuation,
} from '../../../types/domain'

export class Property {
  constructor(
    fractions: Fraction,
    investment: Investment,
    address: Address,
    propertyType: PropertyType,
    floorArea: Area,
    landArea: Area,
    numberOfBedrooms: number,
    numberOfBathrooms: number,
    numberOfParkingSpaces: number,
    laundry: boolean,
    garage: boolean,
    outdoorSpace: boolean,
    deck: boolean,
    condition: string,
    insulation: string[],
    heating: string[],
    internet: string,
    valuations: Valuation[],
    externalRef: string,
    imagesUris: string[],
  ) {
    this.fractions = fractions
    this.investment = investment
    this.address = address
    this.propertyType = propertyType
    this.floorArea = floorArea
    this.landArea = landArea
    this.numberOfBedrooms = numberOfBedrooms
    this.numberOfBathrooms = numberOfBathrooms
    this.numberOfParkingSpaces = numberOfParkingSpaces
    this.laundry = laundry
    this.garage = garage
    this.outdoorSpace = outdoorSpace
    this.deck = deck
    this.condition = condition
    this.insulation = insulation
    this.heating = heating
    this.internet = internet
    this.valuations = valuations
    this.externalRef = externalRef
    this.imagesUris = imagesUris
  }

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

  private calculateAnnualRent() {
    return this.investment.weeklyRent * 52
  }

  private calculateAnnualCosts() {
    return chain(0)
      .add(this.investment.weeklyRates || 0)
      .add(this.investment.weeklyBodyCorpFees || 0)
      .add(this.investment.weeklyPropertyManagementFees || 0)
      .multiply(52)
      .round(2)
      .done()
  }

  private calculateAnnualCashflow(revenue, expenses) {
    return chain(revenue).subtract(expenses).round(2).done()
  }

  calculateBlocksRemaining() {
    this.fractions.blocksRemaining =
      this.fractions.blocksTotal - this.fractions.blocksSold
  }

  calculateTotalFigures() {
    if (!this.investment) {
      // TODO: log warning
      return
    }

    const annualRental = this.calculateAnnualRent()
    const annualTotalCost = this.calculateAnnualCosts()
    const annualNetCashflow = this.calculateAnnualCashflow(
      annualRental,
      annualTotalCost,
    )

    this.investment.totalFigures = {
      annualRental,
      annualTotalCost,
      annualNetCashflow,
    }
  }

  hasEnoughBlocksForPurchase(desiredNumOfBlocks: number) {
    this.calculateBlocksRemaining()

    return this.fractions.blocksRemaining >= desiredNumOfBlocks
  }

  increaseBlocksSold(numberOfBlocks: number) {
    this.validateNumberOfBlocks(numberOfBlocks)
    this.fractions.blocksSold += numberOfBlocks
  }

  decreaseBlocksSold(numberOfBlocks: number) {
    this.validateNumberOfBlocks(numberOfBlocks)
    this.fractions.blocksSold -= numberOfBlocks
  }

  private validateNumberOfBlocks(numberOfBlocks: number) {
    if (numberOfBlocks === null || numberOfBlocks === undefined) {
      throw new ResourceUpdateException(`Failed to update property`)
    }
  }
}
