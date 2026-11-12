import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 15 15" strokeWidth={1.25} {...base} {...props}>
      <circle cx="6.875" cy="6.875" r="5" />
      <path d="M13.125 13.125 10.4 10.4" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <path d="M3 4.5h12" />
      <path d="M3 9h12" />
      <path d="M3 13.5h12" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <path d="M4.5 4.5 13.5 13.5" />
      <path d="M13.5 4.5 4.5 13.5" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <path d="M14.25 15.75v-1.5a3 3 0 0 0-3-3h-4.5a3 3 0 0 0-3 3v1.5" />
      <circle cx="9" cy="5.25" r="3" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <path d="M7.701 15.75a1.5 1.5 0 0 0 2.598 0" />
      <path d="M2.982 11.522C2.83 11.69 2.729 11.897 2.69 12.12a1.02 1.02 0 0 0 .075.607c.08.192.216.356.39.472.174.115.379.176.588.176h10.514c.209 0 .413-.062.587-.177a1.05 1.05 0 0 0 .389-.472 1.02 1.02 0 0 0 .074-.606 1.062 1.062 0 0 0-.29-.598C14.31 10.71 13.5 9.75 13.5 6.75a4.5 4.5 0 1 0-9 0c0 3-.812 3.96-1.518 4.772Z" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <circle cx="6" cy="15.75" r="0.75" />
      <circle cx="14.25" cy="15.75" r="0.75" />
      <path d="M1.5 1.5h1.636a1.5 1.5 0 0 1 1.47 1.208l1.822 9.109a1.5 1.5 0 0 0 1.47 1.208h6.784a1.5 1.5 0 0 0 1.47-1.208l1.1-5.484H4.05" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 13 13" strokeWidth={1.1} {...base} {...props}>
      <path d="M10.292 7.583c.807-.79 1.625-1.739 1.625-2.979a2.98 2.98 0 0 0-2.98-2.979c-.953 0-1.625.271-2.437 1.083-.813-.812-1.485-1.083-2.438-1.083A2.98 2.98 0 0 0 1.083 4.604c0 1.245.813 2.194 1.625 2.98L6.5 11.375l3.792-3.792Z" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 12 12" strokeWidth={1} {...base} {...props}>
      <path d="M2.5 6h7" />
      <path d="M6 2.5 9.5 6 6 9.5" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.333} {...base} {...props}>
      <path d="M12 1.333h-2a3.333 3.333 0 0 0-3.333 3.334v2h-2V9.333h2v5.334h2.666V9.333h2L12 6.667H9.333v-2c0-.368.299-.667.667-.667h2V1.333Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.333} {...base} {...props}>
      <rect x="1.333" y="1.333" width="13.334" height="13.334" rx="3.333" />
      <path d="M10.667 7.58a2.667 2.667 0 1 1-5.278.782 2.667 2.667 0 0 1 5.278-.781Z" />
      <path d="M11.667 4.333h.006" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.4} {...base} {...props}>
      <path d="M1.5 9s2.5-5.25 7.5-5.25S16.5 9 16.5 9s-2.5 5.25-7.5 5.25S1.5 9 1.5 9Z" />
      <circle cx="9" cy="9" r="2.25" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.4} {...base} {...props}>
      <path d="M7.4 4.02A7.3 7.3 0 0 1 9 3.75c5 0 7.5 5.25 7.5 5.25a11.7 11.7 0 0 1-2.16 2.76" />
      <path d="M4.4 5.1A12 12 0 0 0 1.5 9S4 14.25 9 14.25c1.2 0 2.28-.28 3.22-.72" />
      <path d="M7.1 7.1a2.25 2.25 0 0 0 3.18 3.18" />
      <path d="m3 3 12 12" />
    </svg>
  );
}

export function TwitterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.333} {...base} {...props}>
      <path d="M14.667 2.667s-.467 1.4-1.334 2.266c1.067 6.667-6.266 11.534-12 7.734 1.467.066 2.934-.4 4-1.334-3.333-1-5-4.933-3.333-8 1.467 1.734 3.733 2.734 6 2.667-.6-2.8 2.667-4.4 4.666-2.533.734 0 2-.8 2-.8Z" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5.2 12.8 2 13.5l.7-3.2Z" />
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M2.5 5.2 8 2.5l5.5 2.7v6.6L8 14.5 2.5 11.8Z" />
      <path d="M2.5 5.2 8 8l5.5-2.8" />
      <path d="M8 8v6.5" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.6 1.6" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M2.5 7.2 8.2 1.5H13a.5.5 0 0 1 .5.5v4.8L7.8 13.5a1 1 0 0 1-1.4 0L2.5 9.6a1 1 0 0 1 0-1.4Z" />
      <circle cx="10.4" cy="4.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SwatchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M2 10.5 5.5 7l2 2L12 5" />
      <circle cx="11" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <rect x="2" y="2" width="5" height="5" rx="0.8" />
      <rect x="9" y="2" width="5" height="5" rx="0.8" />
      <rect x="2" y="9" width="5" height="5" rx="0.8" />
      <rect x="9" y="9" width="5" height="5" rx="0.8" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M4.5 2.5h5.2L13 5.8v7.7a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" />
      <path d="M9.5 2.5V6h3.5" />
      <path d="M6 9h4" />
      <path d="M6 11.5h2.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.5} {...base} {...props}>
      <path d="M8 3.5v9" />
      <path d="M3.5 8h9" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M3 4.5h10" />
      <path d="M6 4.5V3h4v1.5" />
      <path d="M4.5 4.5 5.2 13h5.6l.7-8.5" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M3.9 3.9l1 1M11.1 11.1l1 1M12.1 3.9l-1 1M4.9 11.1l-1 1" />
    </svg>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" strokeWidth={1.4} {...base} {...props}>
      <path d="M6.5 3.5H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5" />
      <path d="M8.5 8H14" />
      <path d="M11.5 5.5 14 8l-2.5 2.5" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={1.6} {...base} {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.5} {...base} {...props}>
      <path d="M2.25 9.5a6.4 6.4 0 0 1 6.75-6.4A6.4 6.4 0 0 1 15.75 9a6.4 6.4 0 0 1-6.75 6.4 6.5 6.5 0 0 1-2.4-.46L3 15.75l1.02-2.98A6.3 6.3 0 0 1 2.25 9.5Z" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 18 18" strokeWidth={1.4} {...base} {...props}>
      <path d="M16 2 8.3 9.7" />
      <path d="M16 2 11 16 8.3 9.7 2 7Z" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={1.5} {...base} {...props}>
      <path d="M12 16V5" />
      <path d="M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}
