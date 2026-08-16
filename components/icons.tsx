import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/**
 * All icons share one 24px grid, 1.8 stroke and round caps so they read as a
 * single family. They are decorative by default; every critical action pairs an
 * icon with a text label (DESIGN.md §20).
 */
function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5A1.5 1.5 0 0 1 3.5 19z" />
  </Svg>
);

export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.4A7.5 7.5 0 1 1 20.5 12.5z" />
    <path d="M9.8 10a2.3 2.3 0 1 1 3.1 2.2c-.6.3-.9.8-.9 1.4v.3" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconActivity = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M4 12h13M4 17h7" />
    <circle cx="19" cy="17" r="2.2" />
  </Svg>
);

export const IconRewards = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 9.5h17v3h-17zM5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6M12 9.5V20" />
    <path d="M12 9.5S10.6 4 8 4a2.2 2.2 0 0 0 0 5.5zM12 9.5S13.4 4 16 4a2.2 2.2 0 0 1 0 5.5z" />
  </Svg>
);

export const IconProfile = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
  </Svg>
);

export const IconBill = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6L8.4 20.5 6 18.9z" />
    <path d="M9.5 8.5h5M9.5 12.5h5" />
  </Svg>
);

export const IconRoaming = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.2 2.4 3.4 5.4 3.4 8.5s-1.2 6.1-3.4 8.5c-2.2-2.4-3.4-5.4-3.4-8.5S9.8 5.9 12 3.5z" />
  </Svg>
);

export const IconPlan = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M3.5 10h17M7 14.5h4" />
  </Svg>
);

export const IconEsim = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M10 18.5h4" />
    <path d="M9.5 7.5h5v4h-5z" />
  </Svg>
);

export const IconOnboarding = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 8l4.8 1.7-4.8 1.8L12 16l-1.7-4.5L5.5 9.7 10.3 8z" />
    <path d="M18.5 16.5l.7 1.9 2 .8-2 .7-.7 2-.7-2-2-.7 2-.8z" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5.5M11 5.5 4.5 12l6.5 6.5" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.2 19 6v5.6c0 4.2-2.8 7.6-7 9.2-4.2-1.6-7-5-7-9.2V6z" />
    <path d="M9.2 12.2 11.3 14.3 15 10.6" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.8" y="10.5" width="14.4" height="10" rx="2.4" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 10a6 6 0 1 1 12 0c0 3.2.8 4.9 1.6 5.9.4.5 0 1.3-.7 1.3H5.1c-.7 0-1.1-.8-.7-1.3C5.2 14.9 6 13.2 6 10z" />
    <path d="M10 20.2a2.3 2.3 0 0 0 4 0" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8.5" r="3.3" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M16 5.6a3.3 3.3 0 0 1 0 6.4M17.5 14.4a6 6 0 0 1 3 5.1" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7.5" />
  </Svg>
);

export const IconGlobeLang = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17 13 13 0 0 1 0-17z" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.2M12 7.9h.01" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.8 21 19.5H3z" />
    <path d="M12 9.8v4M12 16.6h.01" />
  </Svg>
);

export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.5 13.5 9l4.5 1.5L13.5 12 12 16.5 10.5 12 6 10.5 10.5 9z" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11.5A8 8 0 1 0 18.4 17" />
    <path d="M20 6.5v5h-5" />
  </Svg>
);

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 3.5 10.8 13.2M20.5 3.5l-6.4 17-3.3-7.3-7.3-3.3z" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 17v-5M12.5 17V8M17 17v-7" />
  </Svg>
);

export const IconData = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6.5" rx="7.5" ry="3" />
    <path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </Svg>
);
