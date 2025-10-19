import { Router } from 'express';
import * as c from './controller.js';

const r = Router();
r.get('/', c.list);                        // GET /api/match
r.post('/', c.create);                     // POST /api/match
r.get('/:id/state', c.state);              // GET  /api/match/:id/state
r.post('/:id/answer', c.answer);           // POST /api/match/:id/answer
r.post('/:id/next', c.advance);            // POST /api/match/:id/next
r.get('/:id/scoreboard', c.scoreboard);    // GET  /api/match/:id/scoreboard
r.delete('/:id', c.deleteMatch);           // DELETE /api/match/:id
export default r;