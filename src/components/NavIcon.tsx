export type NavIconName =
  | 'dashboard'
  | 'calendar'
  | 'requests'
  | 'people'
  | 'departments'
  | 'settings'
  | 'signOut'

const PATHS: Record<NavIconName, string[]> = {
  dashboard: [
    'M4.5 4.5h5v5h-5z',
    'M14.5 4.5h5v5h-5z',
    'M14.5 14.5h5v5h-5z',
    'M4.5 14.5h5v5h-5z',
  ],
  requests: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 1.75'],
  calendar: [
    'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
    'M8 3.5V6m8-2.5V6M4 10h16',
  ],
  people: [
    'M15.5 20v-1.5a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5V20',
    'M9.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm11 8.5v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.65a3.5 3.5 0 0 1 0 6.7',
  ],
  departments: [
    'm12 3 9 4.5-9 4.5-9-4.5L12 3Z',
    'm3 12 9 4.5 9-4.5m-18 5 9 4.5 9-4.5',
  ],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  ],
  signOut: [
    'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4',
    'm16 8 4 4-4 4M20 12H9',
  ],
}

interface NavIconProps {
  name: NavIconName
  className?: string
}

export default function NavIcon({ name, className = 'h-5 w-5' }: NavIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
