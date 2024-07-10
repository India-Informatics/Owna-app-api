// eslint-disable-next-line max-classes-per-file
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import * as MongooseDelete from 'mongoose-delete'

@Schema({ collection: 'blocks', timestamps: true })
export class BlockDataModel {
  @Prop()
  userId: Types.ObjectId

  @Prop()
  propertyId: Types.ObjectId

  @Prop()
  blocksPurchased: number
}
export type BlockDocument = HydratedDocument<BlockDataModel>
export const BlockSchema = SchemaFactory.createForClass(BlockDataModel).plugin(
  MongooseDelete,
  { deletedBy: true, deletedByType: String, deletedAt: true, overrideMethods: 'all' },
)
