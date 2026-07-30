import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/http/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "@/src/lib/http/client";
import {
  createAdminCalendarEvent,
  getAdminCalendarEvents,
} from "../../app/(protected)/admin/_lib/admin-insights";
import { normalizeEventDate } from "../../backend/src/modules/events/events.service";

const mockedGet = vi.mocked(api.get);
const eventResponse = {
  data: {
    events: [
      {
        id: 7,
        title: "Faculty Meeting",
        category: "Meeting",
        eventDate: "2026-07-29T16:00:00.000Z",
        endDate: null,
        targetAudience: "All Teachers",
      },
    ],
  },
};
const dashboardEventResponse = {
  data: {
    overview: {
      calendarEvents: eventResponse.data.events,
      upcomingEvents: eventResponse.data.events,
    },
  },
};

describe("Super Admin calendar event loading", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("deduplicates simultaneous dashboard event requests", async () => {
    let finishRequest:
      | ((value: typeof dashboardEventResponse) => void)
      | undefined;
    mockedGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRequest = resolve;
        }),
    );

    const first = getAdminCalendarEvents();
    const second = getAdminCalendarEvents();

    expect(mockedGet).toHaveBeenCalledTimes(1);
    finishRequest?.(dashboardEventResponse);
    await expect(first).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        title: "Faculty Meeting",
        date: "2026-07-30",
      }),
    ]);
    await expect(second).resolves.toHaveLength(1);
  });

  it("allows a retry after an event request fails", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(dashboardEventResponse);

    await expect(getAdminCalendarEvents()).rejects.toThrow(
      "Network unavailable",
    );
    await expect(getAdminCalendarEvents()).resolves.toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("returns a newly created event with its correct Manila calendar date", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { event: eventResponse.data.events[0] },
    });

    const event = await createAdminCalendarEvent({
      title: "Faculty Meeting",
      date: "2026-07-30",
      endDate: null,
      type: "Meetings",
      description: null,
      startTime: "09:00",
      endTime: "10:00",
      targetAudience: "All Teachers",
      location: null,
    });

    expect(event).toEqual(
      expect.objectContaining({
        id: 7,
        date: "2026-07-30",
        type: "Meetings",
      }),
    );
  });
});

describe("event date serialization", () => {
  it("preserves the Manila calendar date returned by MySQL DATEONLY", () => {
    expect(normalizeEventDate(new Date("2026-07-29T16:00:00.000Z"))).toBe(
      "2026-07-30",
    );
  });

  it("keeps an existing DATEONLY string unchanged", () => {
    expect(normalizeEventDate("2026-07-29")).toBe("2026-07-29");
  });
});
