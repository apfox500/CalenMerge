import { NextRequest } from "next/server";
import {fetch_merge} from "../../../lib/calendar-merge";

type CalendarEntry = {
    visibility: "public" | "private" | "loconly";
    name: string;
    ical_link: string;
};

function parseCalendarsJson(raw: string | undefined): Record<string, CalendarEntry[]> {
    if (!raw) {
        return {};
    }

    const candidates = [raw];

    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        candidates.push(raw.slice(1, -1));
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);

            if (typeof parsed === "string") {
                return JSON.parse(parsed) as Record<string, CalendarEntry[]>;
            }

            return parsed as Record<string, CalendarEntry[]>;
        } catch {
            // Try the next candidate.
        }
    }

    throw new Error("CALENDARS_JSON must be valid JSON, for example {\"test\":[{...}]}");
}

export async function GET(request: NextRequest) {
    // figure out who was in the exclude field
    const {searchParams} = new URL(request.url);
    const exclude = searchParams.get('exclude');
    const excludeList : string[] = exclude ? [exclude] : [];
    
    //get all ical links
    const raw = process.env.CALENDARS_JSON;
    const calendars = parseCalendarsJson(raw);

    // call function to get merged calendar data
    const output : string = await fetch_merge(excludeList, calendars);

    // return ical link with the merged calendar data
    if (process.env.OUTPUT === "Text") {
        return new Response(output)
    } else {
        return new Response(output, {
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": "inline; filename=calendar.ics",
            },
        });
    }
}