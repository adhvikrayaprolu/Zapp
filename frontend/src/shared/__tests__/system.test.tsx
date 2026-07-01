import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AppPage,
  AppButton,
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppInput,
  AppSwitch,
  EmptyState,
  FormField,
  InlineNotice,
  LoadingState,
  SectionHeader,
  Surface,
} from "@/shared/components/system";

describe("system components", () => {
  it("renders the primary app primitives with standardized classes", () => {
    render(
      <div>
        <AppButton>Save</AppButton>
        <FormField label="Name" htmlFor="name-field">
          <AppInput id="name-field" />
        </FormField>
        <Surface>Card body</Surface>
      </div>
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("app-button");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveClass("app-input");
    expect(screen.getByText("Card body")).toHaveClass("app-surface-card");
  });

  it("renders shared empty and loading states", () => {
    render(
      <div>
        <EmptyState title="Nothing here" description="Add something to continue." />
        <LoadingState label="Loading data" />
      </div>
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Loading data")).toBeInTheDocument();
  });

  it("renders semantic button variants and the app switch wrapper", () => {
    render(
      <div>
        <AppButton variant="info">Info action</AppButton>
        <AppButton variant="accent">Accent action</AppButton>
        <AppSwitch checked onCheckedChange={() => undefined} label="Private" description="Invite only" />
      </div>
    );

    expect(screen.getByRole("button", { name: "Info action" })).toHaveClass("app-button");
    expect(screen.getByRole("button", { name: "Accent action" })).toHaveClass("app-button");
    expect(screen.getByRole("switch", { name: /private/i })).toBeInTheDocument();
    expect(screen.getByText("Invite only")).toBeInTheDocument();
  });

  it("renders the app dialog wrapper", () => {
    render(
      <AppDialog open onOpenChange={() => undefined}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>Dialog title</AppDialogTitle>
          </AppDialogHeader>
          <AppDialogBody>Dialog body</AppDialogBody>
        </AppDialogContent>
      </AppDialog>
    );

    expect(screen.getByText("Dialog title")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
  });

  it("renders page shell, semantic headings, and inline feedback notices", () => {
    render(
      <AppPage width="compact" spacing="compact">
        <SectionHeader level={2} title="Settings" />
        <InlineNotice tone="danger" title="Sync paused" description="Reconnect to resume updates." action={<AppButton>Retry</AppButton>} />
      </AppPage>
    );

    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("app-inline-notice");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
