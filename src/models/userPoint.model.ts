import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

export const UserPointSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['host_event_completed', 'join_event_completed', 'like_clicked', 'tag_sent', 'other']
  },
  points: {
    type: Number,
    required: 'Points is required'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiredAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});