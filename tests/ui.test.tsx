import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";

describe("HomePage", () => {
  it("renders key panels", () => {
    render(<HomePage />);
    expect(screen.getByText(/Scenario & Execution/i)).toBeInTheDocument();
    expect(screen.getByText(/Results/i)).toBeInTheDocument();
  });

  it("shows schema validation error", () => {
    render(<HomePage />);
    expect(screen.getByText(/Run Demo Scenario/i)).toBeInTheDocument();
  });
});
