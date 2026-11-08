import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: [120, 'title must be 120 characters or less'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'description must be 1000 characters or less'],
    },
    done: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Task = mongoose.model('Task', taskSchema);
