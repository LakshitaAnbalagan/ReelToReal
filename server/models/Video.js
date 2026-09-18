import mongoose from 'mongoose';
const entitySchema = new mongoose.Schema({ name: String, type: String }, { _id: false });
const videoSchema = new mongoose.Schema({
  userId: { type: String, default: 'demo-user', index: true }, sourceUrl: String, fileUrl: String,
  title: String, thumbnail: String, transcript: String, visualAnalysis: String, summary: String,
  category: { type: String, default: 'Other', index: true }, subcategory: String, tags: [String],
  entities: [entitySchema], locations: [String], foods: [String], products: [String], activities: [String],
  price: String, actionableIdeas: [String], embedding: [Number], processingStatus: { type: String, default: 'UPLOADED' },
  isDemo: { type: Boolean, default: false }
}, { timestamps: true });
videoSchema.index({ userId: 1, category: 1, createdAt: -1 });
export default mongoose.model('Video', videoSchema);
