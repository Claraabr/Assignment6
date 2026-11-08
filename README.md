# Tasks API

Assignment 6 for Web Programming: a REST API for a to-do list, built with Node.js, Express and MongoDB (through Mongoose). Tasks are saved in the database, so they are still there after the server restarts.

## Stack

- Node.js 20 or later
- Express 5
- MongoDB (Atlas or a local install) with Mongoose
- dotenv for the connection string

## Setup

1. Clone the repo and install the dependencies:

   ```bash
   git clone https://github.com/Claraabr/Assignment6.git
   cd Assignment6
   npm install
   ```

2. Create the `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

3. Put your MongoDB connection string in `.env`:

   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tasks-api
   PORT=3000
   ```

   With Atlas: create a free cluster, add a database user, allow your IP under Network Access, then copy the connection string (Connect > Drivers) and add `/tasks-api` before the `?` so the data goes into its own database.

   With MongoDB installed locally you can use `mongodb://127.0.0.1:27017/tasks-api` instead.

   `.env` is listed in `.gitignore`, so the password never ends up on GitHub.

4. Start the server:

   ```bash
   npm run dev
   ```

   `npm run dev` uses `node --watch` and restarts on every save. `npm start` runs it without watching. When everything works you should see:

   ```
   connected to MongoDB
   Listening on http://localhost:3000
   ```

   If it says `DB connection failed`, the connection string is wrong or (on Atlas) your IP isn't allowed yet.

## The task resource

A task looks like this:

```json
{
  "_id": "6729f3c1a4b2e81d5c0e9a12",
  "title": "Finish Assignment 6",
  "description": "REST API with Express and MongoDB",
  "done": false,
  "tags": ["web", "school"],
  "createdAt": "2026-11-04T09:15:22.311Z",
  "updatedAt": "2026-11-04T09:15:22.311Z",
  "__v": 0
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `title` | string | required, trimmed, 120 characters max |
| `description` | string | optional, defaults to `""`, 1000 characters max |
| `done` | boolean | optional, defaults to `false` |
| `tags` | array of strings | optional, defaults to `[]` |

`_id`, `createdAt` and `updatedAt` are set by the server. If you send them in a request body they are ignored.

## Routes

Base URL: `http://localhost:3000`

| Method | Route | What it does | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/tasks` | List all tasks, newest first | 200 | 400 |
| GET | `/api/tasks/:id` | Get one task | 200 | 400, 404 |
| POST | `/api/tasks` | Create a task | 201 | 400 |
| PUT | `/api/tasks/:id` | Replace a whole task | 200 | 400, 404 |
| PATCH | `/api/tasks/:id` | Change some fields of a task | 200 | 400, 404 |
| DELETE | `/api/tasks/:id` | Delete a task | 204 | 400, 404 |

Every error comes back as JSON with an `error` message, for example `{ "error": "Task not found" }`. A 500 means something went wrong on the server side (the database is down, for example) and is answered with `{ "error": "Something went wrong on the server" }`.

### GET /api/tasks

Returns every task, newest first. You can filter with `?done=true` or `?done=false`.

```bash
curl localhost:3000/api/tasks
curl "localhost:3000/api/tasks?done=false"
```

Response `200`:

```json
[
  {
    "_id": "6729f3c1a4b2e81d5c0e9a12",
    "title": "Finish Assignment 6",
    "description": "REST API with Express and MongoDB",
    "done": false,
    "tags": ["web", "school"],
    "createdAt": "2026-11-04T09:15:22.311Z",
    "updatedAt": "2026-11-04T09:15:22.311Z",
    "__v": 0
  }
]
```

Response `400` for `?done=maybe`:

```json
{ "error": "done must be true or false" }
```

### GET /api/tasks/:id

```bash
curl localhost:3000/api/tasks/6729f3c1a4b2e81d5c0e9a12
```

Response `200`: the task, same shape as above.

Response `400` when the id isn't a valid MongoDB id (`/api/tasks/123`):

```json
{ "error": "Invalid id" }
```

Response `404` when the id is valid but no task has it:

```json
{ "error": "Task not found" }
```

### POST /api/tasks

Only `title` is required.

```bash
curl -i -X POST localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish Assignment 6","description":"REST API with Express and MongoDB","tags":["web","school"]}'
```

Request body:

```json
{
  "title": "Finish Assignment 6",
  "description": "REST API with Express and MongoDB",
  "tags": ["web", "school"]
}
```

Response `201`: the new task, with its `_id`, `done: false` and the timestamps.

Response `400` when the title is missing or blank:

```json
{ "error": "title is required" }
```

Response `400` when the title is too long:

```json
{ "error": "title must be 120 characters or less" }
```

Response `400` when the body isn't valid JSON:

```json
{ "error": "Request body is not valid JSON" }
```

### PUT /api/tasks/:id

PUT replaces the whole task. `title` is required, and any field you leave out goes back to its default (`description: ""`, `done: false`, `tags: []`).

```bash
curl -i -X PUT localhost:3000/api/tasks/6729f3c1a4b2e81d5c0e9a12 \
  -H "Content-Type: application/json" \
  -d '{"title":"Finish Assignment 6 (final version)","done":false}'
```

Request body:

```json
{
  "title": "Finish Assignment 6 (final version)",
  "done": false
}
```

Response `200`:

```json
{
  "_id": "6729f3c1a4b2e81d5c0e9a12",
  "title": "Finish Assignment 6 (final version)",
  "description": "",
  "done": false,
  "tags": [],
  "createdAt": "2026-11-04T09:15:22.311Z",
  "updatedAt": "2026-11-04T09:20:05.874Z",
  "__v": 0
}
```

Errors: `400` for a missing title, a bad id or a value of the wrong type, `404` if the task doesn't exist.

### PATCH /api/tasks/:id

PATCH only changes the fields you send and leaves the rest alone. You can send any of `title`, `description`, `done`, `tags`.

```bash
curl -i -X PATCH localhost:3000/api/tasks/6729f3c1a4b2e81d5c0e9a12 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

Request body:

```json
{ "done": true }
```

Response `200`: the updated task, with `done: true` and everything else unchanged.

Response `400` when the body has none of the four fields:

```json
{ "error": "Nothing to update: send title, description, done or tags" }
```

Response `400` when a value breaks a rule, for example `{"title": ""}`:

```json
{ "error": "title is required" }
```

or `{"done": "banana"}`:

```json
{ "error": "done has the wrong type" }
```

Response `404` if the task doesn't exist.

### DELETE /api/tasks/:id

```bash
curl -i -X DELETE localhost:3000/api/tasks/6729f3c1a4b2e81d5c0e9a12
```

Response `204 No Content` with an empty body.

Running the same command a second time gives `404`:

```json
{ "error": "Task not found" }
```

### Unknown routes

Anything else, like `GET /api/nothing-here`, returns `404`:

```json
{ "error": "Route not found" }
```

## Testing with Postman

The collection is in `postman/tasks-api.postman_collection.json`.

1. In Postman, click Import and choose the file.
2. Start the server with `npm run dev`.
3. Open the collection, click Run, and run all the requests in order.

There are 24 requests: every route, each one on the success case and on its error cases (missing title, invalid id, missing task, malformed JSON, and so on). Each request has tests on the status code. The first request saves the id of the task it creates in the `{{taskId}}` variable, so the GET, PUT, PATCH and DELETE requests after it use that task. If the server runs on another port, change the `baseUrl` variable of the collection.

## Project structure

```
Assignment6/
├── models/
│   └── Task.js          Mongoose schema and model
├── postman/
│   └── tasks-api.postman_collection.json
├── server.js            Express app, middleware, routes, DB connection
├── .env.example         template for .env
├── .gitignore
├── package.json
└── README.md
```
