import { useState } from 'react'
import BookTimeOffModal from '@/components/BookTimeOffModal'
import Button, { type ButtonVariant } from '@/components/Button'

interface BookTimeOffButtonProps {
  label?: string
  variant?: ButtonVariant
  onBooked?: () => void
}

export default function BookTimeOffButton({
  label = 'Book time off',
  variant = 'primary',
  onBooked,
}: BookTimeOffButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && (
        <BookTimeOffModal onClose={() => setOpen(false)} onBooked={onBooked} />
      )}
    </>
  )
}
