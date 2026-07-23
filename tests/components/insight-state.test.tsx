import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsightState } from "../../app/(protected)/admin/_components/AdminInsightsUI";

describe("InsightState", () => {
  it("renders its loading skeleton", () => {
    render(<InsightState loading />);
    expect(screen.getByText("Loading data…")).toBeInTheDocument();
  });

  it("renders an error state", () => {
    render(<InsightState error />);
    expect(
      screen.getByText(/data service is not available/i),
    ).toBeInTheDocument();
  });

  it("renders a custom empty state", () => {
    render(<InsightState emptyLabel="No records found." />);
    expect(screen.getByText("No records found.")).toBeInTheDocument();
  });
});
