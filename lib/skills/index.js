/**
 * lib/skills/index.js — skill registry.
 *
 * Each skill is a module exporting:
 *   - name:               short identifier (e.g. 'bpom')
 *   - displayName:        what the user sees
 *   - shortDescription:   one-line explanation for the main menu
 *   - systemPromptAddendum: extra system prompt fragment loaded when this
 *                         skill is the active one
 *   - knowledgeSummary:   high-level cheat sheet loaded into context when active
 *   - tools:              array of { schema, handler } (OpenAI function tools)
 */

import ekatalog from './ekatalog/index.js';
import bpom from './bpom/index.js';
import kemenkes from './kemenkes/index.js';

export const skills = [ekatalog, bpom, kemenkes];

export function getSkill(name) {
  return skills.find((s) => s.name === name) || null;
}
