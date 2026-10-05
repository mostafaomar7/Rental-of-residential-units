export interface DashNavLink {
  /** Translation key. */
  label: string;
  icon: string;
  link: string;
  /** Match the URL exactly (use for the portal's root link). */
  exact?: boolean;
  /** Extra URL prefixes that also highlight this link (e.g. detail pages of a list). */
  activeOn?: string[];
  count?: number;
  /** Show the counter in the alert colour. */
  alert?: boolean;
}

export interface DashNavSection {
  /** Translation key of a section heading. */
  section: string;
}

export type DashNavEntry = DashNavLink | DashNavSection;

export function isNavSection(entry: DashNavEntry): entry is DashNavSection {
  return 'section' in entry;
}

/** Whether `link` is the current page for the given URL path (query/fragment already stripped). */
export function isNavLinkActive(link: DashNavLink, path: string): boolean {
  const matches = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
  if (link.exact) return path === link.link;
  return matches(link.link) || (link.activeOn ?? []).some(matches);
}

export interface DashShellConfig {
  /** Latin badge next to the logo, e.g. `OPERATOR` (not translated). */
  badge: string;
  /** Translation key. */
  portalName: string;
  /** Translation key. */
  userName: string;
  /** Translation key. */
  userRole: string;
  nav: DashNavEntry[];
  alertsLink: string;
  alertCount: number;
}
