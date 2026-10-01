import type * as React from "react";
import type { Pref } from "@/emails/types";

export type Group = "Offers" | "Payments" | "Delivery" | "Closures" | "Monitoring" | "Penalties" | "Pools" | "Sites & DR" | "Account" | "Internal";

export interface EmailVariant {
  key: string;
  label: string;
  props: unknown;
  subject: string;
}

export interface EmailDef {
  id: string;
  name: string;
  group: Group;
  /** Who gets it */
  to: string;
  pref: Pref;
  priority: "P0" | "P1" | "P2";
  variants: EmailVariant[];
  /** The subject line for real content */
  subject: (props: unknown) => string;
  render: (props: unknown, opts?: { forceDark?: boolean }) => React.ReactElement;
}

type WithTheme<P> = P & { forceDark?: boolean };

/** One email: its design, its subject line, and sample content for every variant it has (used by the preview page only). */
export function defineEmail<P>(d: {
  id: string;
  name: string;
  group: Group;
  to: string;
  pref: Pref;
  priority: "P0" | "P1" | "P2";
  Component: (p: WithTheme<P>) => React.ReactElement;
  subject: (p: P) => string;
  fixtures: Record<string, { label: string; props: P }>;
}): EmailDef {
  return {
    id: d.id,
    name: d.name,
    group: d.group,
    to: d.to,
    pref: d.pref,
    priority: d.priority,
    variants: Object.entries(d.fixtures).map(([key, f]) => ({ key, label: f.label, props: f.props, subject: d.subject(f.props) })),
    subject: (props) => d.subject(props as P),
    render: (props, opts) => d.Component({ ...(props as P), forceDark: opts?.forceDark }),
  };
}
