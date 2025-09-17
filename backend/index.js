import ICAL from 'node-ical';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const icalUrlParam = url.searchParams.get('url');

    // First, check if the parameter exists at all
    if (!icalUrlParam) {
      return new Response("Error: Please provide a 'url' query parameter.", { status: 400 });
    }

    // Now that we know it exists, we can safely replace the protocol
    const icalUrl = icalUrlParam.replace("webcal://", "https://");

    try {
      // Fetch the original calendar data
      const data = await ICAL.fromURL(icalUrl);

      // Create a new calendar string
      let newIcalString = "BEGIN:VCALENDAR\n";
      newIcalString += "VERSION:2.0\n";
      newIcalString += "PRODID:-//HideMyCalendar//JavaScript Worker//EN\n";

      // Loop through events and add anonymized versions
      for (const event of Object.values(data)) {
        if (event.type !== 'VEVENT') continue;
        
        // Format dates correctly for iCal standard (YYYYMMDDTHHMMSSZ)
        const formatDT = (dt) => dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

        newIcalString += "BEGIN:VEVENT\n";
        newIcalString += `UID:${event.uid}\n`;
        if (event.start) newIcalString += `DTSTART:${formatDT(event.start)}\n`;
        if (event.end) newIcalString += `DTEND:${formatDT(event.end)}\n`;
        if (event.rrule) newIcalString += `RRULE:${event.rrule.toString()}\n`;
        newIcalString += "SUMMARY:Busy\n";
        newIcalString += `DTSTAMP:${formatDT(new Date())}\n`;
        newIcalString += "END:VEVENT\n";
      }

      newIcalString += "END:VCALENDAR\n";

      // Return the new calendar
      return new Response(newIcalString, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
        },
      });
    } catch (error) {
      console.error("An error occurred while processing a calendar."); 
      return new Response("An error occurred while processing the calendar.", { status: 500 });
    }
  },
};
