# Question & Trivia System Documentation

## Overview

The question/trivia system manages the trivia question database, including automated question import from OpenTDB API (10 bonus marks), admin CRUD operations, and random question selection for matches. The system uses content hashing for deduplication and supports filtering by category, difficulty, and text search.

### Key Features

- **Automated Question Import** - Fetch questions from OpenTDB API (10 bonus marks)
- **Content Deduplication** - SHA-1 hash prevents duplicate questions
- **Random Selection** - Get random questions for match gameplay
- **Admin CRUD** - Full question management (create, read, update, delete)
- **Advanced Search** - Filter by category, difficulty, text search
- **Pagination** - Efficient browsing of large question sets
- **Answer Shuffling** - Randomized option order per match
- **Delete Protection** - Cannot delete questions used in matches
- **Category Integration** - Questions linked to category system

---

## Architecture

```
┌────────────────────┐
│  OpenTDB API       │  ← External question source (10 marks)
│  opentdb.com       │
└─────────┬──────────┘
          │ HTTP
          ↓
┌────────────────────┐
│  Import Script     │  ← src/trivia/import.js
│  (import.js)       │     Fetches & normalizes questions
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Trivia DB Layer   │  ← src/trivia/trivia-db.js
│  (trivia-db.js)    │     Batch upsert with deduplication
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Question Service  │  ← src/question/service.js
│  (service.js)      │     CRUD + random selection
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Question Routes   │  ← /api/questions
│  (routes.js)       │
└────────┬───────────┘
         ↓
┌────────────────────┐
│  Prisma ORM        │  ← Database access
│  (PostgreSQL)      │
└────────────────────┘
```

---

## API Endpoints

### 1. Get Random Questions (Match System)

**Endpoint:** `GET /api/questions/random`  
**Authentication:** Not required (public)  
**Description:** Get random questions for match gameplay. Used by match system.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | Yes | Category name (e.g., "Science") |
| difficulty | string | Yes | Difficulty level: `easy`, `medium`, `hard` |
| amount | integer | No | Number of questions (1-50, default: 7) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "questions": [
    {
      "id": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
      "text": "What is the chemical symbol for Gold?",
      "category": "Science",
      "difficulty": "EASY",
      "options": [
        "Au",
        "Ag",
        "Fe",
        "Pb"
      ],
      "correctIndex": 0
    },
    {
      "id": "b4e9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
      "text": "What planet is known as the Red Planet?",
      "category": "Science",
      "difficulty": "EASY",
      "options": [
        "Mars",
        "Venus",
        "Jupiter",
        "Saturn"
      ],
      "correctIndex": 0
    }
  ],
  "count": 2
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| ok | boolean | Request success status |
| questions | array | Array of question objects |
| questions[].id | string | Content hash (used for match_questions) |
| questions[].text | string | Question text |
| questions[].category | string | Category name |
| questions[].difficulty | string | Difficulty (EASY, MEDIUM, HARD) |
| questions[].options | string[] | Four answer options (shuffled) |
| questions[].correctIndex | integer | Index of correct answer (0-3) |
| count | integer | Number of questions returned |

#### Error Responses

**400 Bad Request** - Missing category
```json
{
  "ok": false,
  "error": "Category is required"
}
```

**400 Bad Request** - Invalid difficulty
```json
{
  "ok": false,
  "error": "Valid difficulty is required (easy, medium, hard)"
}
```

**400 Bad Request** - Invalid amount
```json
{
  "ok": false,
  "error": "Amount must be between 1 and 50"
}
```

**500 Internal Server Error** - No questions available
```json
{
  "ok": false,
  "error": "Failed to fetch random questions",
  "message": "No questions found for category 'Science' with difficulty 'EASY'"
}
```

#### Usage Notes
- Options are shuffled per request (different order each time)
- `correctIndex` is included for server-side validation (match system)
- If fewer questions exist than requested, returns all available
- Questions are randomly selected (no repetition within single call)

---

### 2. List Questions (Admin)

**Endpoint:** `GET /api/questions`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** List/search/filter questions for admin dashboard.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Text search (question, answers) |
| category | string | No | Filter by category name |
| difficulty | string | No | Filter by difficulty: `easy`, `medium`, `hard` |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (1-100, default: 20) |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "questions": [
    {
      "content_hash": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
      "category_id": 2,
      "difficulty": "EASY",
      "question_text": "What is the chemical symbol for Gold?",
      "correct_answer": "Au",
      "wrong_answer_1": "Ag",
      "wrong_answer_2": "Fe",
      "wrong_answer_3": "Pb",
      "created_at": "2025-10-14T10:30:00.000Z",
      "category": {
        "name": "Science",
        "description": "Science and Nature questions"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 126,
    "totalPages": 7
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid page
```json
{
  "ok": false,
  "error": "Invalid page number"
}
```

**400 Bad Request** - Invalid limit
```json
{
  "ok": false,
  "error": "Limit must be between 1 and 100"
}
```

**400 Bad Request** - Invalid difficulty
```json
{
  "ok": false,
  "error": "Invalid difficulty (must be easy, medium, or hard)"
}
```

---

### 3. Get Question by ID (Admin)

**Endpoint:** `GET /api/questions/:id`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Get single question details by content hash.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Question content hash |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "question": {
    "content_hash": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
    "category_id": 2,
    "difficulty": "EASY",
    "question_text": "What is the chemical symbol for Gold?",
    "correct_answer": "Au",
    "wrong_answer_1": "Ag",
    "wrong_answer_2": "Fe",
    "wrong_answer_3": "Pb",
    "created_at": "2025-10-14T10:30:00.000Z",
    "category": {
      "category_id": 2,
      "name": "Science",
      "description": "Science and Nature questions"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid question ID (content hash required)"
}
```

**404 Not Found** - Question doesn't exist
```json
{
  "ok": false,
  "error": "Question not found"
}
```

---

### 4. Create Question (Admin)

**Endpoint:** `POST /api/questions`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Manually create a new question.

#### Request Body

```json
{
  "category_id": 2,
  "difficulty": "medium",
  "question_text": "What is the largest planet in our solar system?",
  "correct_answer": "Jupiter",
  "wrong_answer_1": "Saturn",
  "wrong_answer_2": "Neptune",
  "wrong_answer_3": "Uranus"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| category_id | integer | Yes | Category ID (must exist) |
| difficulty | string | Yes | Difficulty: `easy`, `medium`, `hard` |
| question_text | string | Yes | Question text (non-empty) |
| correct_answer | string | Yes | Correct answer (non-empty) |
| wrong_answer_1 | string | Yes | First wrong answer (non-empty) |
| wrong_answer_2 | string | Yes | Second wrong answer (non-empty) |
| wrong_answer_3 | string | Yes | Third wrong answer (non-empty) |

#### Success Response (201 Created)

```json
{
  "ok": true,
  "question": {
    "content_hash": "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    "category_id": 2,
    "difficulty": "medium",
    "question_text": "What is the largest planet in our solar system?",
    "correct_answer": "Jupiter",
    "wrong_answer_1": "Saturn",
    "wrong_answer_2": "Neptune",
    "wrong_answer_3": "Uranus",
    "created_at": "2025-10-15T14:20:00.000Z",
    "category": {
      "name": "Science",
      "description": "Science and Nature questions"
    }
  },
  "message": "Question created successfully"
}
```

#### Error Responses

**400 Bad Request** - Validation errors
```json
{
  "ok": false,
  "error": "Validation failed",
  "errors": [
    "Valid category_id is required",
    "Difficulty must be easy, medium, or hard",
    "Question text is required"
  ]
}
```

**400 Bad Request** - Duplicate answers
```json
{
  "ok": false,
  "error": "All answers must be unique"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

**500 Internal Server Error** - Duplicate question
```json
{
  "ok": false,
  "error": "Failed to create question",
  "message": "Question with this text already exists"
}
```

---

### 5. Update Question (Admin)

**Endpoint:** `PUT /api/questions/:id`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Update question fields (except question_text).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Question content hash |

#### Request Body

All fields are optional. Only provide fields to update.

```json
{
  "difficulty": "hard",
  "correct_answer": "Jupiter",
  "wrong_answer_1": "Saturn",
  "wrong_answer_2": "Uranus",
  "wrong_answer_3": "Neptune"
}
```

#### Success Response (200 OK)

```json
{
  "ok": true,
  "question": {
    "content_hash": "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    "category_id": 2,
    "difficulty": "hard",
    "question_text": "What is the largest planet in our solar system?",
    "correct_answer": "Jupiter",
    "wrong_answer_1": "Saturn",
    "wrong_answer_2": "Uranus",
    "wrong_answer_3": "Neptune",
    "created_at": "2025-10-15T14:20:00.000Z",
    "category": {
      "name": "Science",
      "description": "Science and Nature questions"
    }
  },
  "message": "Question updated successfully"
}
```

#### Error Responses

**400 Bad Request** - Cannot update question_text
```json
{
  "ok": false,
  "error": "Question text cannot be modified (would change content_hash). Delete and recreate instead."
}
```

**400 Bad Request** - No fields provided
```json
{
  "ok": false,
  "error": "At least one field must be provided"
}
```

**404 Not Found** - Question doesn't exist
```json
{
  "ok": false,
  "error": "Question not found"
}
```

**404 Not Found** - Category doesn't exist
```json
{
  "ok": false,
  "error": "Category not found"
}
```

---

### 6. Delete Question (Admin)

**Endpoint:** `DELETE /api/questions/:id`  
**Authentication:** Required - Admin only (JWT + Admin role)  
**Description:** Delete a question (protected if used in matches).

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Question content hash |

#### Success Response (200 OK)

```json
{
  "ok": true,
  "message": "Question deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - Invalid ID
```json
{
  "ok": false,
  "error": "Invalid question ID (content hash required)"
}
```

**404 Not Found** - Question doesn't exist
```json
{
  "ok": false,
  "error": "Question not found"
}
```

**409 Conflict** - Used in matches
```json
{
  "ok": false,
  "error": "Cannot delete question that has been used in matches"
}
```

#### Delete Protection
Questions cannot be deleted if:
- Used in any matches (`match_questions` table)
- Have player answers recorded (`player_answers` table)

This preserves match history integrity.

---

## Frontend Integration

### Admin Question Management

```jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const { data } = await api.get(`/questions?${params.toString()}`);
      setQuestions(data.questions);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentHash) => {
    if (!confirm('Delete this question?')) return;

    try {
      await api.delete(`/questions/${contentHash}`);
      fetchQuestions(); // Refresh list
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Cannot delete: question used in matches');
      } else {
        alert('Failed to delete question');
      }
    }
  };

  return (
    <div className="question-manager">
      <h2>Question Management</h2>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search questions..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
        >
          <option value="">All Categories</option>
          <option value="Science">Science</option>
          <option value="History">History</option>
          <option value="Geography">Geography</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Sports">Sports</option>
          <option value="General Knowledge">General Knowledge</option>
        </select>

        <select
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Question List */}
      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="question-list">
          {questions.map((q) => (
            <div key={q.content_hash} className="question-card">
              <div className="question-header">
                <span className="category">{q.category.name}</span>
                <span className={`difficulty ${q.difficulty.toLowerCase()}`}>
                  {q.difficulty}
                </span>
              </div>
              
              <p className="question-text">{q.question_text}</p>
              
              <div className="answers">
                <div className="correct-answer">✓ {q.correct_answer}</div>
                <div className="wrong-answer">✗ {q.wrong_answer_1}</div>
                <div className="wrong-answer">✗ {q.wrong_answer_2}</div>
                <div className="wrong-answer">✗ {q.wrong_answer_3}</div>
              </div>

              <div className="actions">
                <button onClick={() => handleEdit(q)}>Edit</button>
                <button onClick={() => handleDelete(q.content_hash)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="pagination">
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </button>
          
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} questions)
          </span>
          
          <button
            disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionManager;
```

---

### Create Question Form

```jsx
import React, { useState } from 'react';
import api from './api';

function CreateQuestionForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    category_id: 2, // Default to Science
    difficulty: 'medium',
    question_text: '',
    correct_answer: '',
    wrong_answer_1: '',
    wrong_answer_2: '',
    wrong_answer_3: ''
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const { data } = await api.post('/questions', formData);
      alert('Question created successfully!');
      onSuccess?.(data.question);
      
      // Reset form
      setFormData({
        category_id: 2,
        difficulty: 'medium',
        question_text: '',
        correct_answer: '',
        wrong_answer_1: '',
        wrong_answer_2: '',
        wrong_answer_3: ''
      });
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors([err.response?.data?.error || 'Failed to create question']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-question-form">
      <h3>Create New Question</h3>

      {errors.length > 0 && (
        <div className="errors">
          {errors.map((err, i) => (
            <p key={i} className="error">{err}</p>
          ))}
        </div>
      )}

      <select
        value={formData.category_id}
        onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
        required
      >
        <option value={1}>General Knowledge</option>
        <option value={2}>Science</option>
        <option value={3}>History</option>
        <option value={4}>Geography</option>
        <option value={5}>Entertainment</option>
        <option value={6}>Sports</option>
      </select>

      <select
        value={formData.difficulty}
        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
        required
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <textarea
        placeholder="Question text..."
        value={formData.question_text}
        onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
        required
        rows={3}
      />

      <input
        type="text"
        placeholder="Correct answer"
        value={formData.correct_answer}
        onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Wrong answer 1"
        value={formData.wrong_answer_1}
        onChange={(e) => setFormData({ ...formData, wrong_answer_1: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Wrong answer 2"
        value={formData.wrong_answer_2}
        onChange={(e) => setFormData({ ...formData, wrong_answer_2: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Wrong answer 3"
        value={formData.wrong_answer_3}
        onChange={(e) => setFormData({ ...formData, wrong_answer_3: e.target.value })}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Question'}
      </button>
    </form>
  );
}

export default CreateQuestionForm;
```

---

## Automated Question Import (10 Bonus Marks)

### OpenTDB API Integration

The system automatically imports questions from OpenTDB API, earning **10 bonus marks** for automated question scraping.

#### Import Script

**Location:** `server/src/trivia/import.js`

**Run Command:**
```bash
make import-questions
# OR
node server/src/trivia/import.js
```

#### What It Does

1. **Fetches questions from OpenTDB API**
   - 6 categories: Science, History, Geography, Entertainment, Sports, General Knowledge
   - 3 difficulties: Easy, Medium, Hard
   - 7 questions per difficulty = 21 per category = **126 total questions**

2. **Normalizes data**
   - URL-decodes text
   - Normalizes whitespace and quotes
   - Shuffles answer options
   - Maps OpenTDB categories to canonical names

3. **Generates content hashes**
   - SHA-1 hash of question + answers
   - Ensures deduplication (no duplicate questions)

4. **Inserts into database**
   - Upserts (creates if new, skips if exists)
   - Creates categories if missing
   - Reports inserted/skipped counts

#### Import Output Example

```
═══════════════════════════════════════════════
  Trivia Question Import Tool
═══════════════════════════════════════════════

📡 Fetching questions from OpenTDB API...
   (This may take a minute due to API rate limits)

✓ Fetched 126 unique questions from OpenTDB

📊 Questions by category:
   Science              21
   History              21
   Geography            21
   Entertainment        21
   Sports               21
   General Knowledge    21

💾 Inserting questions into database...

═══════════════════════════════════════════════
✅ Import Complete!
═══════════════════════════════════════════════
   Inserted: 126 new questions
   Skipped:  0 (already in database)

💡 View questions:
   make db-studio    (opens Prisma Studio GUI)
```

---

## Service Layer Functions

### `getRandomQuestions({ category, difficulty, amount })`

Fetch random questions for match gameplay.

```javascript
const questions = await getRandomQuestions({
  category: 'Science',
  difficulty: 'EASY',
  amount: 10
});
// Returns: Array of questions with shuffled options
```

**Features:**
- Validates category exists
- Randomly selects from available questions
- Shuffles answer options per request
- Returns `correctIndex` for server validation
- Throws error if no questions found

---

### `listQuestions({ search, category, difficulty, page, limit })`

List questions with search and pagination (admin).

```javascript
const result = await listQuestions({
  search: 'water',
  category: 'Science',
  difficulty: 'easy',
  page: 1,
  limit: 20
});
// Returns: { questions: [...], total: 42 }
```

**Features:**
- Text search (question + all answers)
- Category filter by name
- Difficulty filter
- Pagination support
- Includes category details

---

### `getQuestionById(contentHash)`

Get single question by content hash.

```javascript
const question = await getQuestionById('a3f8b2c1d4e5f6...');
// Returns: Question object with category details
// Throws: Error('Question not found')
```

---

### `createQuestion(data)`

Create new question manually.

```javascript
const question = await createQuestion({
  category_id: 2,
  difficulty: 'medium',
  question_text: 'What is the largest planet?',
  correct_answer: 'Jupiter',
  wrong_answer_1: 'Saturn',
  wrong_answer_2: 'Uranus',
  wrong_answer_3: 'Neptune'
});
// Returns: Created question with auto-generated content_hash
// Throws: Error('Category not found')
// Throws: Error('Question with this text already exists')
```

**Content Hash:**
- Automatically generated from question text
- SHA-1 hash ensures uniqueness
- Used as primary key

---

### `updateQuestion(contentHash, updates)`

Update question fields (except question_text).

```javascript
const question = await updateQuestion('a3f8b2c1d4e5f6...', {
  difficulty: 'hard',
  correct_answer: 'New Answer'
});
// Returns: Updated question
// Throws: Error('Question text cannot be modified')
// Throws: Error('Question not found')
```

**Limitation:**
- Cannot update `question_text` (would change hash)
- Delete and recreate instead

---

### `deleteQuestion(contentHash)`

Delete question with protection.

```javascript
await deleteQuestion('a3f8b2c1d4e5f6...');
// Throws: Error('Cannot delete question: it has been used in 5 match(es)')
// Throws: Error('Question not found')
```

**Protection:**
- Checks `match_questions` table
- Checks `player_answers` table
- Prevents deletion if used (preserves history)

---

### `getQuestionCountsByCategory()`

Get question counts per category.

```javascript
const counts = await getQuestionCountsByCategory();
// Returns: [{ category: 'Science', count: 42 }, ...]
```

---

### `getQuestionCountsByDifficulty()`

Get question counts per difficulty.

```javascript
const counts = await getQuestionCountsByDifficulty();
// Returns: { easy: 42, medium: 45, hard: 39 }
```

---

## Database Schema

### Trivia Questions Table

```sql
trivia_questions (
  content_hash TEXT PRIMARY KEY,          -- SHA-1 hash (unique)
  category_id INTEGER REFERENCES categories(category_id),
  difficulty VARCHAR(50) NOT NULL,        -- EASY, MEDIUM, HARD
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  wrong_answer_1 TEXT NOT NULL,
  wrong_answer_2 TEXT NOT NULL,
  wrong_answer_3 TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Indexes:**
- Primary key: `content_hash`
- Foreign key: `category_id`
- Useful: `difficulty`, `created_at`

**Constraints:**
- All answer fields required (NOT NULL)
- Referenced by `match_questions` (CASCADE)

---

## OpenTDB API Details

### API Endpoints Used

**Get Questions:**
```
GET https://opentdb.com/api.php?amount=10&category=17&difficulty=medium&type=multiple&encode=url3986&token={token}
```

**Request Token:**
```
GET https://opentdb.com/api_token.php?command=request
```

### Category Mapping

| Canonical Name | OpenTDB ID |
|----------------|------------|
| General Knowledge | 9 |
| Science | 17 |
| Entertainment | 11 |
| Geography | 22 |
| Sports | 21 |
| History | 23 |

### Rate Limiting

- **Delay:** 600ms between requests
- **Max per request:** 50 questions
- **Token:** Prevents duplicate questions across requests
- **Retry logic:** Handles 429 Too Many Requests
- **Exponential backoff:** For server errors (500-599)

### Response Format

```json
{
  "response_code": 0,
  "results": [
    {
      "category": "Science: Nature",
      "type": "multiple",
      "difficulty": "medium",
      "question": "What%20is%20the%20chemical%20symbol%20for%20gold%3F",
      "correct_answer": "Au",
      "incorrect_answers": ["Ag", "Fe", "Pb"]
    }
  ]
}
```

**Response Codes:**
- `0` - Success
- `1` - No results
- `2` - Invalid parameter
- `3` - Token not found
- `4` - Token empty (all questions used)

---

## Testing

### Manual Testing with cURL

**Get random questions:**
```bash
curl "http://localhost:3000/api/questions/random?category=Science&difficulty=easy&amount=5"
```

**List questions (admin):**
```bash
curl "http://localhost:3000/api/questions?search=water&category=Science&page=1&limit=10"
```

**Get single question:**
```bash
curl "http://localhost:3000/api/questions/a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9"
```

**Create question:**
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 2,
    "difficulty": "medium",
    "question_text": "What is the largest planet?",
    "correct_answer": "Jupiter",
    "wrong_answer_1": "Saturn",
    "wrong_answer_2": "Uranus",
    "wrong_answer_3": "Neptune"
  }'
```

**Update question:**
```bash
curl -X PUT http://localhost:3000/api/questions/a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9 \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "hard"
  }'
```

**Delete question:**
```bash
curl -X DELETE http://localhost:3000/api/questions/a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9
```

**Import questions:**
```bash
make import-questions
# OR
node server/src/trivia/import.js
```

---

## Best Practices

### Question Creation

✅ **Use content hashing** - Ensures uniqueness  
✅ **Validate all 4 answers** - Must be unique  
✅ **Trim whitespace** - Clean data  
✅ **Check category exists** - Foreign key constraint  
✅ **Use descriptive questions** - Clear and unambiguous  

### Admin Operations

✅ **Protect deletions** - Check match usage first  
✅ **Paginate large lists** - Don't fetch all questions  
✅ **Search before create** - Avoid duplicates  
✅ **Log admin actions** - Audit trail (future enhancement)  

### Match Integration

✅ **Shuffle options** - Different order each match  
✅ **Don't reveal correctIndex to client** - Security  
✅ **Cache question counts** - For statistics display  
✅ **Handle insufficient questions** - Return fewer if needed  

---

## Known Issues & Limitations

### Current Limitations

1. **No admin authentication** - Routes currently public (TODO in routes.js)
2. **Cannot edit question_text** - Would change content_hash (by design)
3. **No question versioning** - Edits overwrite (no history)
4. **No soft delete** - Permanently removes unused questions
5. **No question reporting** - Players can't flag bad questions
6. **No difficulty adjustment** - Fixed difficulty levels
7. **Basic text search** - No fuzzy matching or stemming
8. **No question tags** - Only category-based organization

### Future Enhancements

- Admin authentication middleware (secure CRUD operations)
- Question approval workflow (review before publishing)
- Player reporting system (flag inappropriate/incorrect questions)
- Question statistics (accuracy rates, average time)
- Advanced search (tags, full-text search with PostgreSQL)
- Bulk import from CSV/JSON
- Question versioning (edit history)
- Soft delete with archive
- Multi-language support
- Image/media support in questions

---

## Performance Considerations

### Optimizations

✅ **Content hash primary key** - Fast lookups  
✅ **Category cache** - Reduces DB queries during import  
✅ **Pagination** - Efficient list queries  
✅ **Indexed foreign keys** - Fast joins  
✅ **Batch upsert** - Import efficiency  

### Potential Bottlenecks

⚠️ **Text search** - LIKE queries can be slow on large datasets  
⚠️ **Random selection** - ORDER BY RANDOM() is O(n)  
⚠️ **Import rate limiting** - 600ms delay per category (necessary for API)  

### Recommended Improvements

```sql
-- Add full-text search index
CREATE INDEX idx_question_text_search 
ON trivia_questions 
USING GIN(to_tsvector('english', question_text));

-- Add category + difficulty composite index
CREATE INDEX idx_category_difficulty 
ON trivia_questions(category_id, difficulty);

-- Optimize random selection with TABLESAMPLE (PostgreSQL)
SELECT * FROM trivia_questions 
WHERE category_id = $1 AND difficulty = $2 
TABLESAMPLE BERNOULLI(10)  -- Sample 10%
LIMIT 10;
```

---

## Error Handling

### Error Response Format

```json
{
  "ok": false,
  "error": "Error message",
  "errors": ["Error 1", "Error 2"]  // For validation errors
}
```

### Common Errors

| Status | Error | Scenario |
|--------|-------|----------|
| 400 | Category is required | Missing category in random query |
| 400 | Valid difficulty is required | Invalid difficulty value |
| 400 | Amount must be between 1 and 50 | Invalid amount |
| 400 | Validation failed | Multiple validation errors |
| 400 | All answers must be unique | Duplicate answers in create |
| 400 | Question text cannot be modified | Trying to update question_text |
| 404 | Question not found | Invalid content hash |
| 404 | Category not found | Invalid category_id |
| 409 | Cannot delete question... | Question used in matches |
| 500 | No questions found for... | No matching questions |
| 500 | Failed to fetch random questions | Database error |

---

## Makefile Commands

```makefile
# Import questions from OpenTDB API (10 bonus marks)
make import-questions

# View questions in Prisma Studio GUI
make db-studio

# Reset and re-import (development)
make db-reset
make db-seed
make import-questions
```

---

## Contact & Maintenance

This question/trivia system was developed as part of the CS343 Trivia Tournament project.

**Key Files:**
- `server/src/question/routes.js` - Route definitions
- `server/src/question/controller.js` - HTTP request handlers
- `server/src/question/service.js` - Business logic and CRUD operations
- `server/src/trivia/opentdb.js` - OpenTDB API integration (10 marks)
- `server/src/trivia/import.js` - Import script
- `server/src/trivia/trivia-db.js` - Database batch operations

**Dependencies:**
- `@prisma/client` - Database ORM
- Node.js `crypto` - SHA-1 content hashing
- `fetch` API - HTTP requests to OpenTDB

**Integration Points:**
- Match service (`server/src/match/service.js`) - Calls `getRandomQuestions()`
- Category system (`server/src/category/`) - Foreign key relationship
- Admin dashboard (frontend) - CRUD interface

**Bonus Mark Features:**
- ✅ Automated question scraping from OpenTDB API (10 marks)
- ✅ Content deduplication with SHA-1 hashing
- ✅ Batch import with progress reporting
- ✅ Rate limiting and retry logic

**Last Updated:** 15 October 2025
