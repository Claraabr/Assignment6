import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { Task } from './models/Task.js';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;
const app = express();

function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next();
}

app.use(logger);
app.use(express.json());

// used on POST and PUT
function requireTitle(req, res, next) {
  const { title } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  next();
}

// used on every route with :id
function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

// ?done=true or ?done=false to filter
app.get('/api/tasks', async (req, res) => {
  const { done } = req.query;
  const filter = {};
  if (done !== undefined) {
    if (done !== 'true' && done !== 'false') {
      return res.status(400).json({ error: 'done must be true or false' });
    }
    filter.done = done === 'true';
  }

  try {
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/tasks/:id', checkId, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/tasks', requireTitle, async (req, res) => {
  // the server sets _id, createdAt and updatedAt, not the client
  const { title, description, done, tags } = req.body;
  try {
    const task = await Task.create({ title, description, done, tags });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT replaces everything, so missing fields go back to their default
app.put('/api/tasks/:id', checkId, requireTitle, async (req, res) => {
  const { title, description = '', done = false, tags = [] } = req.body;
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, done, tags },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH only changes the fields that are sent
app.patch('/api/tasks/:id', checkId, async (req, res) => {
  const { title, description, done, tags } = req.body ?? {};
  const changes = {};
  if (title !== undefined) changes.title = title;
  if (description !== undefined) changes.description = description;
  if (done !== undefined) changes.done = done;
  if (tags !== undefined) changes.tags = tags;

  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const task = await Task.findByIdAndUpdate(req.params.id, changes, {
      new: true,
      runValidators: true,
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', checkId, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// express.json() sends an HTML page when the body is broken JSON,
// this sends a JSON error instead
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  res.status(500).json({ error: 'Server error' });
});

try {
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
