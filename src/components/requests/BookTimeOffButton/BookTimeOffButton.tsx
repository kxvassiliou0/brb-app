import { useState } from 'react'
import BookTimeOffModal from '@/components/requests/BookTimeOffModal'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

export default function BookTimeOffButton({
  onBooked,
}: {
  onBooked: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="primary"
        testId="book-time-off"
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" />
        Book time off
      </Button>
      {open && (
        <BookTimeOffModal onClose={() => setOpen(false)} onBooked={onBooked} />
      )}
    </>
  )
}
