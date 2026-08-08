# Apartment Calendar Consolidation Project: Motivation and Specifications

## 1. Project Motivation

* **The Problem:** Coordinating schedules with roommates is difficult when everyone uses different calendar platforms (Google Calendar, Outlook) and maintains multiple independent calendars (Personal, Work, Classes) for privacy and organization.
* **The Inefficiencies of Existing Methods:**
* Sharing individual calendars requires roommates to toggle multiple views to see who is home.
* Master shared calendars force users to double-enter their events to maintain privacy.
* Third-party synchronization tools are either paid professional services or require downloading entirely separate social apps.


* **The Goal:** Build a lightweight, custom tool that automatically merges the roommates' public calendar feeds into personalized master iCal links. The tool must strip all private event details (descriptions, locations), rename all events to "[Name] - Busy", and filter out a user's own events to prevent duplication.

---

## 2. Technical Specifications

### Architecture & Deployment

* **Hosting Platform:** Vercel (Serverless Functions) on the free Hobby plan.
* **Environment:** Node.js (JavaScript/TypeScript).
* **Vercel Hobby Plan Limits:** The free tier supports up to 1,000,000 edge requests per month. The maximum execution duration for a Vercel Function on this tier is 300 seconds (5 minutes). Fetching and merging the text files will execute well within these constraints.

### Libraries & Dependencies

* **Data Ingestion & Parsing:** `node-ical`. This library is a feature-rich iCalendar/ICS parser for Node.js. It provides robust recurrence rule expansion and timezone-aware date handling.
* **Data Generation:** `ical-generator`. This library is designed to quickly create valid iCal calendars and subscriptionable calendar feeds.

### Workflow & Logic

1. **Request:** A user's calendar application sends a GET request to the Vercel endpoint, appending their unique identifier as a query parameter (e.g., `?exclude=andrew`).
2. **Ingestion:** The serverless function retrieves the configuration via an environment variable (`CALENDARS_JSON`) to securely access the real public `.ics` links.
3. **Filtering:** The script iterates through the configuration and fetches the calendar feeds of all roommates, excluding the feeds associated with the ID in the query parameter.
4. **Sanitization:** The fetched calendars are parsed. The function iterates over every event, stripping metadata (descriptions, locations, attendees) and overwriting the `SUMMARY` field to `[Roommate Name] - Busy`.
5. **Output:** The sanitized events are compiled into a new iCalendar object and served back to the requester as a unified feed.

### Security & Privacy Configuration

* **Code Repository:** The project repository can safely be made public and open-source.
* **Documentation:** A `calendars.example.json` file with placeholder URLs will be included in the public repository to demonstrate the configuration format.
* **Secret Storage:** The actual JSON object containing the live `.ics` URLs will be stored exclusively in Vercel's Environment Variables (`process.env.CALENDARS_JSON`). The serverless function acts as a secure proxy, ensuring the underlying private links are never exposed to the internet.