import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
}

export default function Card({ children }: CardProps) {
  return (
    <div className="w-full rounded-2xl bg-background-secondary p-8 shadow-xl shadow-black/10">
      {children}
    </div>
  )
}
