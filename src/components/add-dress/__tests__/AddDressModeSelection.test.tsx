import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddDressModeSelection } from "../AddDressModeSelection";

describe("AddDressModeSelection", () => {
  it("should render nothing when editDress is true", () => {
    const onModeChange = vi.fn();
    const { container } = render(
      <AddDressModeSelection
        addMode="variant"
        onModeChange={onModeChange}
        editDress={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render Item Type label and both mode buttons when not editing", () => {
    const onModeChange = vi.fn();
    render(
      <AddDressModeSelection
        addMode="variant"
        onModeChange={onModeChange}
        editDress={false}
      />
    );
    expect(screen.getByText("Item Type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add variant/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create unique/i })).toBeInTheDocument();
  });

  it("should show description for variant when addMode is variant", () => {
    render(
      <AddDressModeSelection
        addMode="variant"
        onModeChange={vi.fn()}
        editDress={false}
      />
    );
    expect(screen.getByText(/Add a variant/)).toBeInTheDocument();
  });

  it("should show description for unique when addMode is unique", () => {
    render(
      <AddDressModeSelection
        addMode="unique"
        onModeChange={vi.fn()}
        editDress={false}
      />
    );
    expect(screen.getByText(/unique name/)).toBeInTheDocument();
  });

  it("should call onModeChange when clicking Add Variant", () => {
    const onModeChange = vi.fn();
    render(
      <AddDressModeSelection
        addMode="unique"
        onModeChange={onModeChange}
        editDress={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /add variant/i }));
    expect(onModeChange).toHaveBeenCalledWith("variant");
  });

  it("should call onModeChange when clicking Create Unique", () => {
    const onModeChange = vi.fn();
    render(
      <AddDressModeSelection
        addMode="variant"
        onModeChange={onModeChange}
        editDress={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /create unique/i }));
    expect(onModeChange).toHaveBeenCalledWith("unique");
  });
});
