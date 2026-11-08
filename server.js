import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { Task } from './models/Task.js';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;
const app = express();

// ---------- middleware ----------

function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next();
}

app.use(logger);
app.use(express.json());

// POST and PUT need a real title
function requireTitle(req, res, next) {
  const { title } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  next();
}

// any route with :id checks the id first (400 = bad id, 404 = no such task)
function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

// schema errors are the client's fault (400), anything else is ours (500)
function sendError(res, err) {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) =>
      e.name === 'CastError' ? `${e.path} has the wrong type` : e.message
    );
    return res.status(400).json({ error: messages.join(', ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `${err.path} has the wrong type` });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
}

// ---------- routes ----------

// list all tasks, newest first. Optional filter: ?done=true or ?done=false
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
    sendError(res, err);
  }
});

app.get('/api/tasks/:id', checkId, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/tasks', requireTitle, async (req, res) => {
  // only take the fields we know; _id and timestamps are set by the server
  const { title, description, done, tags } = req.body;
  try {
    const task = await Task.create({ title, description, done, tags });
    res.status(201).json(task);
  } catch (err) {
    sendError(res, err);
  }
});

// PUT replaces the whole task: fields you leave out go back to their defaults
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
    sendError(res, err);
  }
});

// PATCH changes only the fields you send
app.patch('/api/tasks/:id', checkId, async (req, res) => {
  const { title, description, done, tags } = req.body ?? {};
  const changes = {};
  if (title !== undefined) changes.title = title;
  if (description !== undefined) changes.description = description;
  if (done !== undefined) changes.done = done;
  if (tags !== undefined) changes.tags = tags;

  if (Object.keys(changes).length === 0) {
    return res
      .status(400)
      .json({ error: 'Nothing to update: send title, description, done or tags' });
  }

  try {
    const task = await Task.findByIdAndUpdate(req.params.id, changes, {
      new: true,
      runValidators: true,
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    sendError(res, err);
  }
});

app.delete('/api/tasks/:id', checkId, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.sendStatus(204);
  } catch (err) {
    sendError(res, err);
  }
});

// nothing matched
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// errors thrown before a route runs, e.g. a body that isn't valid JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// ---------- start: connect first, then listen ----------

if (!dbUri) {
  console.error('MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

try {
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
