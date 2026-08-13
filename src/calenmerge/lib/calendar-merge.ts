import {CalendarResponse, parseICS} from "node-ical";
import ical, { ICalCalendar, ICalEventData } from 'ical-generator';
/**
 * The type of each calendar entry from the env file
 */
type CalendarEntry = {
    visibility: "public" | "private" | "loconly";
    name: string;
    ical_link: string;
};


/**
 * Top level function to run whole calendar merging script
 * @param exclude the name of the person to exclude from the merged calendar, if any
 * @param calendars a list of calendar objects to merge
 */
export async function fetch_merge(exclude : string[], calendars : Record<string, CalendarEntry[]>) : Promise<string>{
    let acc : CalendarResponse[] = []; // accumulator for all parsed and sanitized calendars

    for (const [name, cals] of Object.entries(calendars)) {
        if(!exclude.includes(name)){
            for (const cal of cals) {
                    const parsedCal = await fetch_cal(cal.ical_link);
                    const sanitizedCal = sanitize_cal(cal.name, parsedCal, cal.visibility);
                    acc.push(sanitizedCal);
            }
        }
    }

    const mergedCal = merge_calendars(acc);
    const serializedCal = serialize_cal(mergedCal);
    return serializedCal;
}

/**
 * Fecthes the ical data from a given link
 * @param link a link to an ical file
 */
async function fetch_cal(link : string) : Promise<CalendarResponse>{
    //fetch ical data from link
    const response = await fetch(link);

    if(!response.ok)
        throw new Error(`Failed to fetch calendar from ${link}: ${response.statusText}`);
    
    const icalData = await response.text();

    // parse ical data into ParsedCalendar type using node-ical
    const parsedCal = parseICS(icalData);

    return parsedCal;

}

/**
 * Given a calendar object, it will obfuscate private data, if desired
 * @param name the name of the calendar owner
 * @param cal calendar object to sanitize
 * @param visibilty the privacy setting of the calendar, either 'public', 'loconly', or 'private'
 */
function sanitize_cal(name: string, cal: CalendarResponse, visibility: string): CalendarResponse {
  const sanitized_cal: CalendarResponse = {};

  for (const key of Object.keys(cal)) {
    const event = cal[key];

    if (!event || event.type !== "VEVENT") {
      continue;
    }

    const newEvent = { ...event };

    if (visibility === "public") {
        newEvent.summary = `${name}: ${event.summary}`;
    }else{
        newEvent.summary = `${name}`;

    }

    if (visibility === "loconly") {
      delete newEvent.description;
      delete newEvent.attendees;
      delete newEvent.organizer;
    }

    if (visibility === "private") {
      delete newEvent.description;
      delete newEvent.location;
      delete newEvent.attendees;
      delete newEvent.organizer;
    }

    sanitized_cal[key] = newEvent;
  }

  return sanitized_cal;
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    const val = (value as { val?: unknown }).val;
    if (typeof val === "string") return val;
  }
  return undefined;
}

/**
 * Given multiple calendar objects, it will merge them into one calendar object
 * @param calendars a list of calendar objects to merge
 */
function merge_calendars(calendars : CalendarResponse[]) : ICalCalendar{
    const merged_cal = ical({name: "Roomate Calendar"});
    for (const cal of calendars) {
        for (const key of Object.keys(cal)) {
            const event = cal[key];
            if (!event || event.type !== "VEVENT") {
                console.warn(`Skipping invalid event with key ${key}`);
                continue;
            }

            // convert  CalendarComponent to ICalEvent | ICalEventData from ical

            const eventData: ICalEventData = {
            start: event.start,
            end: event.end,
            summary: toText(event.summary),
            description: toText(event.description),
            location: toText(event.location),
            id: typeof event.uid === "string" ? event.uid : undefined,
};
            merged_cal.createEvent(eventData);
        }
    }

    return merged_cal;
}

function serialize_cal(cal : ICalCalendar) : string{
    return cal.toString();
}