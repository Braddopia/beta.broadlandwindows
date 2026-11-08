/* features/records/appointments: Appointments and reminders on a lead. */
import { company } from '../../config/company.js';
import { ATYPES } from '../../config/constants.js';
import { onClick } from '../../core/actions.js';
import { iso, today } from '../../core/dates.js';
import { $, esc } from '../../core/dom.js';
import { copyText, download } from '../../core/download.js';
import { uuid } from '../../core/ids.js';
import { siteOf } from '../../domain/customers.js';
import { staffNames } from '../../domain/people.js';
import { rfH } from './cards.js';
import { APPTF } from './fields.js';
import { recRedraw, recordWin } from './record-window.js';
import { emptyArt } from '../../ui/components/art.js';
import { toast } from '../../ui/toast.js';

/* the appointment as it is on screen (main, i<0) or from the list */
export function apptGet(i) {
  const g = (k) => {
    const e = $('#f_' + k);
    return e ? e.value : recordWin.v[k] || '';
  };
  if (i < 0)
    return {
      ty: g('apptType') || 'Home survey',
      d: g('apptDate'),
      tm: g('apptTime'),
      w: g('apptWith'),
      st: g('apptStatus'),
    };
  const a = (recordWin.v.appts || [])[i] || {};
  return { ty: a.ty, d: a.d, tm: a.tm, w: a.w, st: a.st };
}
export function apptCust() {
  const g = (k) => {
    const e = $('#f_' + k);
    return String(e ? e.value : recordWin.v[k] || '').trim();
  };
  return {
    nm: [g('title'), g('name')].filter(Boolean).join(' ') || 'there',
    em: g('email1'),
    mob: g('mob1') || g('mob2') || g('mob3'),
    addr: siteOf({
      siteSame: g('siteSame'),
      siteAddr: g('siteAddr'),
      siteAddr2: g('siteAddr2'),
      siteTown: g('siteTown'),
      siteCounty: g('siteCounty'),
      sitePc: g('sitePc'),
      homeAddr: g('homeAddr'),
      homeAddr2: g('homeAddr2'),
      town: g('town'),
      county: g('county'),
      homePc: g('homePc'),
    }),
  };
}
export const apptWhen = (a) =>
  a.d
    ? new Date(a.d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) +
      (a.tm ? ' at ' + a.tm : '')
    : '';
export function apptSend(i, how) {
  const a = apptGet(i),
    c = apptCust();
  if (!a.d) {
    toast('Set the date first');
    return;
  }
  const txt = `Hello ${c.nm}, this is a reminder of your ${String(a.ty || 'appointment').toLowerCase()} with Broadland Windows on ${apptWhen(a)}${c.addr ? ' at ' + c.addr : ''}.${a.w ? ' ' + a.w + ' will be with you.' : ''} If you need to change it, please call ${company.tel}.`;
  if (how == 'email') {
    if (!c.em) {
      toast('Add the customer email on the Customer step');
      return;
    }
    location.href =
      'mailto:' +
      encodeURIComponent(c.em) +
      '?subject=' +
      encodeURIComponent('Your Broadland Windows appointment, ' + apptWhen(a)) +
      '&body=' +
      encodeURIComponent(txt + '\n\nKind regards,\nBroadland Windows');
  } else if (how == 'sms') {
    if (!c.mob) {
      toast('Add a mobile number on the Customer step');
      return;
    }
    location.href = 'sms:' + c.mob.replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(txt);
  } else if (how == 'copy') copyText(txt);
  else if (how == 'ics') {
    const p = (n) => String(n).padStart(2, '0'),
      d = a.d.replace(/-/g, ''),
      tm = (a.tm || '09:00').replace(':', '') + '00',
      e = new Date(a.d + 'T' + (a.tm || '09:00'));
    e.setHours(e.getHours() + 1);
    const end = iso(e).replace(/-/g, '') + 'T' + p(e.getHours()) + p(e.getMinutes()) + '00',
      ix = (s) =>
        String(s || '')
          .replace(/[\\,;]/g, '\\$&')
          .replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Broadland Windows//CRM//EN',
      'BEGIN:VEVENT',
      'UID:' + uuid() + '@broadland-crm',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART:' + d + 'T' + tm,
      'DTEND:' + end,
      'SUMMARY:' + ix((a.ty || 'Appointment') + ': ' + c.nm),
      'LOCATION:' + ix(c.addr),
      'DESCRIPTION:' + ix(a.w ? 'With ' + a.w : ''),
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    download('appointment-' + a.d + '.ics', new Blob([ics], { type: 'text/calendar' }));
  }
  if (how != 'copy') {
    (recordWin.v.log = recordWin.v.log || []).unshift({
      d: today(),
      t: how == 'ics' ? 'Calendar file made' : how == 'sms' ? 'Text reminder' : 'Email reminder',
      n: (a.ty || '') + ' ' + apptWhen(a),
      by: USER,
    });
    recordWin.dirty = 1;
    recRedraw('notes');
  }
}
export const apptBtns = (i) =>
  `<div class="apb"><button type="button" class="mini pri" ${onClick('apptSend', i, 'email')}>Email reminder</button><button type="button" class="mini" ${onClick('apptSend', i, 'sms')}>Text reminder</button><button type="button" class="mini" ${onClick('apptSend', i, 'ics')}>Add to calendar</button><button type="button" class="mini" ${onClick('apptSend', i, 'copy')}>Copy</button></div>`;
export const apptTab = (W) => `<div class="rcols"><section class="rg"><h4>Next Visit</h4>${APPTF()
  .map((f) => rfH(f, W.v))
  .join('')}${apptBtns(-1)}</section>
  <section class="rg"><h4>Other Visits And Calls</h4><div class="radd"><select id="ra_ty">${ATYPES.map((x) => `<option>${x}</option>`).join('')}</select><input id="ra_d" type="date"><input id="ra_tm" type="time"><select id="ra_w">${staffNames()
    .filter(Boolean)
    .map((x) => `<option>${esc(x)}</option>`)
    .join(
      ''
    )}</select><button class="mini pri" ${onClick('recAdd', 'appts', ['ty', 'd', 'tm', 'w'], 'appts')}>Book</button></div>
  ${(W.v.appts || []).map((a, i) => `<div class="apc"><div class="apc-h"><span class="apc-d"><b>${a.d ? new Date(a.d + 'T00:00').getDate() : '-'}</b><small>${a.d ? new Date(a.d + 'T00:00').toLocaleDateString('en-GB', { month: 'short' }) : ''}</small></span><span><b>${esc(a.ty || 'Visit')}</b><br><span class="muted">${a.d ? esc(apptWhen(a)) : 'No date'}${a.w ? ' · ' + esc(a.w) : ''}</span></span><button class="mini del" ${onClick('recDel', 'appts', i, 'appts')} aria-label="Remove">&times;</button></div>${apptBtns(i)}</div>`).join('') || emptyArt('holiday', 'Nothing else booked yet.')}</section></div>`;
export const nextAppt = (l) =>
  [l.apptDate, ...(l.appts || []).map((a) => a.d)]
    .filter(Boolean)
    .sort()
    .find((d) => d >= today()) || '';
