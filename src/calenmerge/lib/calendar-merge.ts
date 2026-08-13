import {CalendarResponse, EventInstance, expandRecurringEvent, parseICS, VEvent} from "node-ical";
import ical, { ICalCalendar, ICalEventData } from 'ical-generator';
/**
 * The type of each calendar entry from the env file
 */
type CalendarEntry = {
    visibility: "public" | "private" | "loconly";
    name: string;
    ical_link: string;
};

const LOOKBACK_DAYS = 7;
const LOOKAHEAD_DAYS = 90;
const DAY_IN_MS = 24 * 60 * 60 * 1000;


/**
 * Top level function to run whole calendar merging script
 * @param exclude the name of the person to exclude from the merged calendar, if any
 * @param calendars a list of calendar objects to merge
 */
export async function fetch_merge(exclude : string[], calendars : Record<string, CalendarEntry[]>) : Promise<string>{
  const acc : ICalEventData[] = []; // accumulator for all sanitized event instances
  const { start: windowStart, end: windowEnd } = getEventWindow();

    for (const [name, cals] of Object.entries(calendars)) {
        if(!exclude.includes(name)){
            for (const cal of cals) {
                    const parsedCal = await fetch_cal(cal.ical_link);
                    const sanitizedEvents = sanitize_cal(cal.name, parsedCal, cal.visibility, windowStart, windowEnd);
                    acc.push(...sanitizedEvents);
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
function sanitize_cal(
  name: string,
  cal: CalendarResponse,
  visibility: string,
  windowStart: Date,
  windowEnd: Date,
): ICalEventData[] {
  const sanitizedEvents: ICalEventData[] = [];

  for (const key of Object.keys(cal)) {
    const event = cal[key];

    if (!event || event.type !== "VEVENT") {
      continue;
    }

    if (event.transparency === "TRANSPARENT") {
      continue;
    }

    const instances = expandRecurringEvent(event as VEvent, {
      from: windowStart,
      to: windowEnd,
      expandOngoing: true,
    });

    for (const instance of instances) {
      sanitizedEvents.push(createSanitizedEvent(name, instance, visibility));
    }
  }

  return sanitizedEvents;
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    const val = (value as { val?: unknown }).val;
    if (typeof val === "string") return val;
  }
  return undefined;
}

function getEventWindow(referenceDate = new Date()): { start: Date; end: Date } {
  const referenceTime = referenceDate.getTime();

  return {
    start: new Date(referenceTime - LOOKBACK_DAYS * DAY_IN_MS),
    end: new Date(referenceTime + LOOKAHEAD_DAYS * DAY_IN_MS),
  };
}

function createSanitizedEvent(name: string, instance: EventInstance, visibility: string): ICalEventData {
  const sanitizedEvent: ICalEventData = {
    start: instance.start,
    end: instance.end,
    summary: visibility === "public" ? `${name}: ${toText(instance.summary) ?? ""}` : `${name}`,
    allDay: instance.isFullDay,
  };

  if (visibility === "public") {
    sanitizedEvent.description = toText(instance.event.description);
    sanitizedEvent.location = toText(instance.event.location);
  }

  return sanitizedEvent;
}

/**
 * Given multiple calendar objects, it will merge them into one calendar object
 * @param calendars a list of calendar objects to merge
 */
function merge_calendars(calendars : ICalEventData[]) : ICalCalendar{
    const merged_cal = ical({name: "Roomate Calendar"});

    for (const event of calendars) {
      merged_cal.createEvent(event);
    }

    return merged_cal;
}

function serialize_cal(cal : ICalCalendar) : string{
    return cal.toString();
}