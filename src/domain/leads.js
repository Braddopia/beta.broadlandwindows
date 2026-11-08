/* domain/leads: Lead rules: win chance and the full lead list including converted leads. */
import { state } from '../data/state.js';

export const PROB = { New: 10, Surveyed: 30, Quoted: 55, Won: 100, Lost: 0 };
export const allLeads = () => [...state.leads, ...(state.leadArchive || []).map((l) => ({ ...l, stage: 'Won' }))];
/* a won lead is always 100% and a lost one 0%, whatever was typed before */
export const leadProb = (l) =>
  l.stage == 'Won' ? 100 : l.stage == 'Lost' ? 0 : l.prob != null && l.prob !== '' ? +l.prob : (PROB[l.stage] ?? 0);
