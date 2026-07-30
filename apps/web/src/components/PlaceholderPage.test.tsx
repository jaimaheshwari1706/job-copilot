import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceholderPage } from "./PlaceholderPage";

describe("PlaceholderPage", () => {
  it("renders the title and phase note", () => {
    render(<PlaceholderPage title="Dashboard" phase="Phase 13" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Phase 13/)).toBeInTheDocument();
  });
});
