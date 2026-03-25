export default async function handler(req, res) {
  const { animal, type, date } = req.query;
  if (!animal || !type || !date) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }
  const typeName = type === 'antipuces' ? 'Anti-puces / Tiques' : type === 'vermifuge' ? 'Vermifuge' : 'Vaccin';
  const title = animal + ' — ' + typeName;
  const uid = Date.now() + '@vetid.app';
  const dateStr = date.replace(/-/g, '');
  const dtstart = dateStr + 'T080000Z';
  const dtend = dateStr + 'T090000Z';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VetID//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTART:' + dtstart,
    'DTEND:' + dtend,
    'SUMMARY:' + title,
    'DESCRIPTION:Rappel de traitement VetID pour ' + animal,
    'BEGIN:VALARM',
    'TRIGGER:-PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + title,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="vetid-rappel.ics"');
  res.status(200).send(ics);
}
